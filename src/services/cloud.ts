import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile } from "../types";

let activeRequests = 0;
const MAX_CONCURRENT = 5; 
const queue: (() => void)[] = [];

const processQueue = () => {
  if (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const next = queue.shift();
    if (next) { activeRequests++; next(); }
  }
};

/**
 * INSTANT THUMBNAIL EXTRACTOR
 * This converts the 'stripped' bytes into a viewable DataURL instantly.
 */
function extractStrippedThumb(doc: Api.Document): string | null {
  const stripped = doc.thumbs?.find(t => t instanceof Api.PhotoStrippedSize) as Api.PhotoStrippedSize;
  if (!stripped) return null;

  // Telegram stripped thumbs are mini JPEGs without headers. 
  // We wrap them in a standard JPEG header to make them viewable.
  const header = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 
    0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x28, 0x1c, 0x1e, 0x23, 0x1e, 0x19, 0x28, 
    0x23, 0x21, 0x23, 0x2d, 0x2b, 0x28, 0x30, 0x3c, 0x50, 0x34, 0x30, 0x2d, 0x2d, 0x3c, 0x7b, 0x58, 
    0x5d, 0x49, 0x50, 0x73, 0x66, 0x78, 0x76, 0x73, 0x66, 0x71, 0x82, 0x93, 0xbc, 0xa1, 0x82, 0x89, 
    0xb1, 0x8c, 0x71, 0x76, 0xa2, 0xdd, 0xa5, 0xb1, 0xc1, 0xc8, 0xcd, 0xcd, 0xcd, 0x7c, 0x99, 0xe1, 
    0xf0, 0xe1, 0xc6, 0xef, 0xaf, 0xcd, 0xcd, 0xcd, 0xff, 0xc0, 0x00, 0x11, 0x08
  ]);
  const footer = Buffer.from([0xff, 0xd9]);
  const fullJpeg = Buffer.concat([header, Buffer.from([stripped.bytes.length]), stripped.bytes, footer]);
  return `data:image/jpeg;base64,${fullJpeg.toString('base64')}`;
}

export async function getThumbnail(message: Api.Message): Promise<string | null> {
  const cacheKey = `th_v3:${message.id}`;
  const cachedUrl = await cacheService.getThumbnail(cacheKey);
  if (cachedUrl) return cachedUrl;

  return new Promise((resolve) => {
    const startRequest = async () => {
      const client = telegramService.client;
      if (!client) { resolve(null); return; }
      try {
        // Fetch smallest possible size 's' for grid
        const buffer = await client.downloadMedia(message, { thumbClass: "s" });
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

export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
  const client = await telegramService.init();
  const messages = await client.getMessages("me", { limit: 50, offsetId });
  
  return messages
    .filter(msg => msg.media instanceof Api.MessageMediaDocument)
    .map(msg => {
      const doc = (msg.media as Api.MessageMediaDocument).document as Api.Document;
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
        // NEW: Instant blurred preview
        instantThumb: extractStrippedThumb(doc)
      };
    });
}

export async function getTotalStorageStats(): Promise<{ total: number, photos: number, videos: number }> {
  const client = await telegramService.init();
  let total = 0, photos = 0, videos = 0;
  const messages = await client.getMessages("me", { limit: 500 }); 
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
  const messages = await client.getMessages("me", { ids: [messageId] });
  return await client.downloadMedia(messages[0], {
    progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
  });
}

export async function deleteFileFromTelegram(messageId: number) {
  const client = await telegramService.init();
  await client.deleteMessages("me", [messageId], { revoke: true });
}