import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile } from "../types";

const messageCache = new Map<number, Api.Message>();
const inflightThumbs = new Map<number, Promise<string | null>>();
const thumbQueue: (() => void)[] = [];
let activeDownloads = 0;
const MAX_CONCURRENT = 4;

const processQueue = () => {
    if (thumbQueue.length > 0 && activeDownloads < MAX_CONCURRENT) {
        activeDownloads++;
        const next = thumbQueue.shift();
        if (next) next();
    }
};

export async function getThumbnail(messageId: number): Promise<string | null> {
    const cacheKey = `thumb_v8:${messageId}`;
    const cached = await cacheService.getThumbnail(cacheKey);
    if (cached) return cached;

    if (inflightThumbs.has(messageId)) return inflightThumbs.get(messageId)!;

    const downloadPromise = new Promise<string | null>((resolve) => {
        const startDownload = async () => {
            try {
                const client = telegramService.client;
                const msg = messageCache.get(messageId);
                if (!client || !msg || !msg.media) return resolve(null);

                let doc: Api.Document | null = null;
                if (msg.media instanceof Api.MessageMediaDocument) {
                    doc = msg.media.document as Api.Document;
                }

                if (!doc || !doc.thumbs) return resolve(null);

                // SURGICAL FIX: We ONLY look for PhotoSize objects that have a .type ('s', 'm', etc)
                // This excludes PhotoStrippedSize which was causing the 10MB download fallback.
                const validThumb = doc.thumbs.find(t => t instanceof Api.PhotoSize) as Api.PhotoSize;

                if (!validThumb || !validThumb.type) {
                    console.warn(`[GALLERY THUMB] No downloadable thumb for ${messageId}. Skipping to prevent full download.`);
                    return resolve(null);
                }

                console.log(`[GALLERY THUMB] Requesting ID: ${messageId} | Size Type: ${validThumb.type}`);

                const buffer = await client.downloadMedia(msg, {
                    thumb: validThumb.type // Force selection of ONLY this small slice
                });

                if (buffer) {
                    console.log(`[GALLERY THUMB] SUCCESS: ID ${messageId} | Received: ${buffer.length} bytes`);
                    await cacheService.setThumbnail(cacheKey, buffer as any);
                    resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
                } else resolve(null);

            } catch (err) {
                console.error(`[GALLERY THUMB] Blocked error for ${messageId}`, err);
                resolve(null);
            } finally {
                activeDownloads--;
                inflightThumbs.delete(messageId);
                processQueue();
            }
        };
        thumbQueue.push(startDownload);
        processQueue();
    });

    inflightThumbs.set(messageId, downloadPromise);
    return downloadPromise;
}

export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
    const client = await telegramService.init();
    // Increase limit for better loading
    const messages = await client.getMessages("me", { limit: 50, offsetId });
    
    return messages
        .filter(msg => msg.media instanceof Api.MessageMediaDocument)
        .map(msg => {
            messageCache.set(msg.id, msg);
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
                isVideo: doc.mimeType.startsWith('video/') || !!videoAttr,
                duration: videoAttr?.duration || 0
            };
        });
}

// RESTORED STABLE STORAGE SCANNER
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
    console.info(`%c [GALLERY ORIGINAL] FULL RESOLUTION REQUESTED: ${messageId}`, 'color: #EF4444; font-weight: 800');
    
    const msgs = await client.getMessages("me", { ids: [messageId] });
    return await client.downloadMedia(msgs[0], {
        progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
    });
}

export async function deleteFileFromTelegram(messageId: number) {
    const client = await telegramService.init();
    await client.deleteMessages("me", [messageId], { revoke: true });
}