import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile } from "../types";

let activeRequests = 0;
const MAX_CONCURRENT = 8; // Increased for high-speed Wi-Fi
const queue: (() => void)[] = [];

const processQueue = () => {
  if (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const next = queue.shift();
    if (next) { activeRequests++; next(); }
  }
};

export async function getThumbnail(message: Api.Message): Promise<string | null> {
  const cacheKey = `thumb_lowres:${message.id}`;
  const cachedUrl = await cacheService.getThumbnail(cacheKey);
  if (cachedUrl) return cachedUrl;

  return new Promise((resolve) => {
    const startRequest = async () => {
      const client = telegramService.client;
      if (!client || !client.connected) { resolve(null); return; }
      
      try {
        // Specifically requesting the 'm' size (medium) which is ~10-15KB
        const buffer = await client.downloadMedia(message, { 
          thumbClass: "m" 
        });

        if (buffer) {
          await cacheService.setThumbnail(cacheKey, buffer as any);
          resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
        } else resolve(null);
      } catch { resolve(null); }
      finally { activeRequests--; processQueue(); }
    };
    queue.push(startRequest);
    processQueue();
  });
}

/**
 * FETCH WITH PAGINATION
 * offsetId: The ID of the last message in your current list
 */
export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
  const client = await telegramService.init();
  
  const messages = await client.getMessages("me", { 
    limit: 60,
    offsetId: offsetId // This tells Telegram: "Give me messages OLDER than this ID"
  });
  
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

// downloadFileFromTelegram & delete remain exactly as before
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