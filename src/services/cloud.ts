import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile } from "../types";

// SPEED FIX: Parallel Concurrency increased to 6
let activeRequests = 0;
const MAX_CONCURRENT = 6; 
const queue: (() => void)[] = [];

const processQueue = () => {
  if (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const next = queue.shift();
    if (next) { activeRequests++; next(); }
  }
};

export async function getThumbnail(message: Api.Message, size: 'small' | 'large' = 'small'): Promise<string | null> {
  const cacheKey = `thumb:${message.id}:${size}`;
  const cachedUrl = await cacheService.getThumbnail(cacheKey);
  if (cachedUrl) return cachedUrl;

  return new Promise((resolve) => {
    const startRequest = async () => {
      const client = telegramService.client;
      if (!client || !client.connected) { resolve(null); return; }
      
      try {
        // LOW-RES LOGIC: 
        // We look for 's' (smallest) or 'm' (medium) size thumbnails in Telegram
        const buffer = await client.downloadMedia(message, { 
          thumbClass: size === 'small' ? 'm' : 'x' 
        });

        if (buffer) {
          await cacheService.setThumbnail(cacheKey, buffer as any);
          resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
        } else resolve(null);
      } catch { resolve(null); }
      finally {
        activeRequests--;
        processQueue();
      }
    };

    queue.push(startRequest);
    processQueue();
  });
}

export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
  const client = await telegramService.init();
  const messages = await client.getMessages("me", { limit: 50, offsetId });
  
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
      };
    });
}

// downloadFileFromTelegram and delete remain same as previous working state
export async function downloadFileFromTelegram(messageId: number, onProgress: (p: number) => void) {
  const client = await telegramService.init();
  const messages = await client.getMessages("me", { ids: [messageId] });
  return await client.downloadMedia(messages[0], {
    progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
  });
}

export async function deleteFileFromTelegram(messageId: number) {
  const client = await telegramService.init();
  await client.deleteMessages("me", [messageId], { revoke: true });
}