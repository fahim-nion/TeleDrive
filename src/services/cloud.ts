import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile } from "../types";

let activeRequests = 0;
const MAX_CONCURRENT = 3;
const queue: (() => void)[] = [];

const processQueue = () => {
  if (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const next = queue.shift();
    if (next) { activeRequests++; next(); }
  }
};

export async function getThumbnail(message: Api.Message): Promise<string | null> {
  const cacheKey = `thumb:${message.id}`;
  
  // 1. Try to get from local persistent cache (IndexedDB)
  const cachedUrl = await cacheService.getThumbnail(cacheKey);
  if (cachedUrl) {
    console.info(`%c [Cache] HIT: ${message.id}`, 'color: #10B981; font-weight: bold');
    return cachedUrl;
  }

  console.info(`%c [Cache] MISS: ${message.id} -> Fetching from Telegram...`, 'color: #F59E0B');

  return new Promise((resolve) => {
    const startRequest = async () => {
      const client = telegramService.client;
      if (!client || !client.connected) { resolve(null); return; }
      try {
        const buffer = await client.downloadMedia(message, { thumbClass: Api.PhotoSize });
        if (buffer) {
          await cacheService.setThumbnail(cacheKey, buffer);
          resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
        } else resolve(null);
      } catch { resolve(null); }
      finally { activeRequests--; processQueue(); }
    };
    queue.push(startRequest);
    processQueue();
  });
}

export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
  const client = await telegramService.init();
  // Fetching 60 items per batch
  const messages = await client.getMessages("me", { limit: 60, offsetId });
  
  return messages
    .filter(msg => msg.media instanceof Api.MessageMediaDocument)
    .map(msg => {
      const doc = msg.media.document as Api.Document;
      const fileAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
      const videoAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeVideo) as Api.DocumentAttributeVideo;
      return {
        messageId: msg.id,
        name: fileAttr?.fileName || "Unknown",
        size: Number(doc.size),
        date: msg.date,
        mimeType: doc.mimeType,
        downloadStatus: 'IDLE',
        downloadProgress: 0,
        thumbnail: (doc.thumbs && doc.thumbs.length > 0) ? msg : undefined,
        isVideo: doc.mimeType.startsWith('video/') || !!videoAttr,
        duration: videoAttr?.duration || 0,
        selected: false
      };
    });
}

export async function getTotalStorageStats(): Promise<{ total: number, photos: number, videos: number }> {
  const client = await telegramService.init();
  let total = 0, photos = 0, videos = 0;
  const messages = await client.getMessages("me", { limit: 1000 }); // Scan 1000 for stats
  for (const msg of messages) {
    if (msg.media instanceof Api.MessageMediaDocument) {
      const doc = msg.media.document as Api.Document;
      const size = Number(doc.size);
      total += size;
      if (doc.mimeType.startsWith('video/')) videos += size;
      else photos += size;
    }
  }
  return { total, photos, videos };
}

export async function downloadFileFromTelegram(messageId: number, onProgress: (p: number) => void) {
  const client = await telegramService.init();
  try {
    const messages = await client.getMessages("me", { ids: [messageId] });
    return await client.downloadMedia(messages[0], {
      progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
    });
  } catch (err: any) {
    // Stale reference auto-recovery
    const messages = await client.getMessages("me", { ids: [messageId] });
    return await client.downloadMedia(messages[0], {
      progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
    });
  }
}

export async function deleteFileFromTelegram(messageId: number) {
  const client = await telegramService.init();
  await client.deleteMessages("me", [messageId], { revoke: true });
}