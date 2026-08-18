import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache"; // Import the new cache
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

/**
 * Optimized Thumbnail Fetcher
 * Checks IndexedDB first, then Telegram.
 */
export async function getThumbnail(message: Api.Message): Promise<string | null> {
  const cacheKey = `thumb:${message.id}`;
  
  // 1. Try to get from local persistent cache
  const cachedUrl = await cacheService.getThumbnail(cacheKey);
  if (cachedUrl) return cachedUrl;

  return new Promise((resolve) => {
    const startRequest = async () => {
      const client = telegramService.client;
      if (!client || !client.connected) { resolve(null); return; }
      
      try {
        // 2. Fetch from Telegram if not in cache
        const buffer = await client.downloadMedia(message, { thumbClass: Api.PhotoSize });
        if (buffer) {
          // 3. Save to local persistent cache for next time
          await cacheService.setThumbnail(cacheKey, buffer);
          const blobUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' }));
          resolve(blobUrl);
        } else {
          resolve(null);
        }
      } catch (err: any) {
        // Handle expired references during thumbnail fetch
        if (err.message?.includes('FILE_REFERENCE_EXPIRED')) {
            console.warn("Thumb reference expired, would need re-fetch logic here.");
        }
        resolve(null); 
      }
      finally { activeRequests--; processQueue(); }
    };

    queue.push(startRequest);
    processQueue();
  });
}

/**
 * Robust Media Downloader with Auto-Recovery
 * Fixes the "Old files fail to load" issue.
 */
export async function downloadFileFromTelegram(messageId: number, onProgress: (p: number) => void): Promise<Buffer | any> {
  const client = await telegramService.init();
  
  const attemptDownload = async (msg: any) => {
    return await client.downloadMedia(msg, {
      progressCallback: (t, d) => onProgress(Math.round((Number(d) / Number(t)) * 100))
    });
  };

  try {
    const messages = await client.getMessages("me", { ids: [messageId] });
    if (!messages || messages.length === 0) throw new Error("File not found");
    
    return await attemptDownload(messages[0]);
  } catch (err: any) {
    // RECOVERY LOGIC: If reference is stale, we re-resolve the message from Telegram
    if (err.message?.includes('FILE_REFERENCE_EXPIRED') || err.code === 400) {
      console.log(`[Recovery] Reference stale for ${messageId}, refreshing...`);
      
      // Re-fetching the message from Telegram gives us a brand new 'file_reference'
      const refreshedMessages = await client.getMessages("me", { ids: [messageId] });
      return await attemptDownload(refreshedMessages[0]);
    }
    throw err;
  }
}

// (fetchCloudFiles, getTotalStorageStats, deleteFileFromTelegram stay the same)
export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
  const client = await telegramService.init();
  const messages = await client.getMessages("me", { limit: 50, offsetId });
  return messages.filter(msg => msg.media instanceof Api.MessageMediaDocument).map(msg => {
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
  const messages = await client.getMessages("me", { limit: 1000 }); 
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

export async function deleteFileFromTelegram(messageId: number) {
  const client = await telegramService.init();
  await client.deleteMessages("me", [messageId], { revoke: true });
}