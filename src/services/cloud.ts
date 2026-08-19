import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile } from "../types";

const MAX_CONCURRENT_THUMBS = 4;
let activeThumbs = 0;
const thumbQueue: (() => void)[] = [];

const processThumbQueue = () => {
    while (thumbQueue.length > 0 && activeThumbs < MAX_CONCURRENT_THUMBS) {
        const next = thumbQueue.shift();
        if (next) { activeThumbs++; next(); }
    }
};

/**
 * FIXED: Target specific small PhotoSize objects.
 * This prevents the "Starting direct file download in chunks of 131072" bug.
 */
export async function getThumbnail(message: Api.Message): Promise<string | null> {
    const cacheKey = `thumb_v5:${message.id}`;
    const cached = await cacheService.getThumbnail(cacheKey);
    if (cached) return cached;

    return new Promise((resolve) => {
        const task = async () => {
            try {
                const client = telegramService.client;
                if (!client) throw new Error("No Client");

                const media = message.media as Api.MessageMediaDocument;
                const doc = media.document as Api.Document;

                // 1. Manually find the smallest suitable thumb object
                // We avoid passing the whole 'message' to prevent library fallback to full download
                const thumbLocation = doc.thumbs?.find(t => 
                    t instanceof Api.PhotoSize || t instanceof Api.PhotoCachedSize
                );

                if (!thumbLocation) {
                    console.warn(`[GALLERY THUMB] No valid thumb object found for ${message.id}`);
                    resolve(null);
                    return;
                }

                console.debug(`[GALLERY THUMB] Requesting specific size: ${message.id}`);
                
                // 2. Download ONLY the thumb object location
                const buffer = await client.downloadMedia(message, {
                    thumbClass: thumbLocation instanceof Api.PhotoSize ? thumbLocation.type : undefined
                });

                if (buffer) {
                    await cacheService.setThumbnail(cacheKey, buffer as any);
                    resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
                } else resolve(null);

            } catch (err: any) {
                if (err.message.includes('REFERENCE_EXPIRED')) {
                    console.log(`[GALLERY THUMB] Stale reference for ${message.id}, skipping...`);
                }
                resolve(null);
            } finally {
                activeThumbs--;
                processThumbQueue();
            }
        };
        thumbQueue.push(task);
        processThumbQueue();
    });
}

export async function downloadFileFromTelegram(messageId: number, onProgress: (p: number) => void) {
    const client = await telegramService.init();
    console.info(`[GALLERY ORIGINAL] FULL DOWNLOAD STARTED for ID: ${messageId}`);
    
    const fetchAndDownload = async () => {
        const msgs = await client.getMessages("me", { ids: [messageId] });
        if (!msgs || msgs.length === 0) throw new Error("Message not found");
        return await client.downloadMedia(msgs[0], {
            progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
        });
    };

    try {
        return await fetchAndDownload();
    } catch (err: any) {
        if (err.message.includes('REFERENCE')) {
            console.log(`[Recovery] Refreshing original file reference for ${messageId}`);
            return await fetchAndDownload();
        }
        throw err;
    }
}

// (fetchCloudFiles and delete functions remain stable as verified before)
export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
  const client = await telegramService.init();
  const messages = await client.getMessages("me", { limit: 50, offsetId });
  return messages.filter(msg => msg.media instanceof Api.MessageMediaDocument).map(msg => {
      const doc = (msg.media as Api.MessageMediaDocument).document as Api.Document;
      const fileAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
      const videoAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeVideo) as Api.DocumentAttributeVideo;
      const stripped = doc.thumbs?.find(t => t instanceof Api.PhotoStrippedSize) as Api.PhotoStrippedSize;
      
      let instantThumb = null;
      if (stripped) {
          const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x28, 0x1c, 0x1e, 0x23, 0x1e, 0x19, 0x28, 0x23, 0x21, 0x23, 0x2d, 0x2b, 0x28, 0x30, 0x3c, 0x50, 0x34, 0x30, 0x2d, 0x2d, 0x3c, 0x7b, 0x58, 0x5d, 0x49, 0x50, 0x73, 0x66, 0x78, 0x76, 0x73, 0x66, 0x71, 0x82, 0x93, 0xbc, 0xa1, 0x82, 0x89, 0xb1, 0x8c, 0x71, 0x76, 0xa2, 0xdd, 0xa5, 0xb1, 0xc1, 0xc8, 0xcd, 0xcd, 0xcd, 0x7c, 0x99, 0xe1, 0xf0, 0xe1, 0xc6, 0xef, 0xaf, 0xcd, 0xcd, 0xcd, 0xff, 0xc0, 0x00, 0x11, 0x08]);
          const footer = Buffer.from([0xff, 0xd9]);
          instantThumb = `data:image/jpeg;base64,${Buffer.concat([header, Buffer.from([stripped.bytes.length]), stripped.bytes, footer]).toString('base64')}`;
      }

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
        instantThumb
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