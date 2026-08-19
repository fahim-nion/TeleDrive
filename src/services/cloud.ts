import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile } from "../types";

const messageCache = new Map<number, Api.Message>();
const inflightThumbs = new Map<number, Promise<string | null>>();
const thumbQueue: (() => void)[] = [];
let activeDownloads = 0;
const MAX_CONCURRENT = 5;

const processQueue = () => {
    if (thumbQueue.length > 0 && activeDownloads < MAX_CONCURRENT) {
        activeDownloads++;
        const next = thumbQueue.shift();
        if (next) next();
    }
};

// Internal Helper for Atomic Download (Bypasses 131072 chunks for small items)
async function atomicFetch(doc: Api.Document | Api.Photo, sizeType: string, msg: Api.Message): Promise<Uint8Array | null> {
    const client = telegramService.client;
    if (!client) return null;
    try {
        return await client.downloadMedia(msg, { thumb: sizeType }) as any;
    } catch { return null; }
}

export async function getThumbnail(messageId: number): Promise<string | null> {
    const cacheKey = `th_v11:${messageId}:s`;
    const cached = await cacheService.getThumbnail(cacheKey);
    if (cached) return cached;
    if (inflightThumbs.has(messageId)) return inflightThumbs.get(messageId)!;

    const downloadPromise = new Promise<string | null>((resolve) => {
        const startDownload = async () => {
            try {
                const msg = messageCache.get(messageId);
                if (!msg) return resolve(null);
                const buffer = await atomicFetch(null as any, 's', msg);
                if (buffer) {
                    await cacheService.setThumbnail(cacheKey, buffer);
                    resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
                } else resolve(null);
            } catch { resolve(null); }
            finally { activeDownloads--; inflightThumbs.delete(messageId); processQueue(); }
        };
        thumbQueue.push(startDownload);
        processQueue();
    });
    inflightThumbs.set(messageId, downloadPromise);
    return downloadPromise;
}

/**
 * NEW: OPTIMIZED PREVIEW (Tier 2)
 * Fetches high-quality 1280px thumbnail for the viewer instead of original file.
 */
export async function getOptimizedPreview(messageId: number): Promise<string | null> {
    const msg = messageCache.get(messageId);
    if (!msg) return null;
    const buffer = await atomicFetch(null as any, 'y', msg) || await atomicFetch(null as any, 'm', msg);
    return buffer ? URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })) : null;
}

export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
    const client = await telegramService.init();
    const messages = await client.getMessages("me", { limit: 60, offsetId });
    return messages.filter(msg => msg.media instanceof Api.MessageMediaDocument).map(msg => {
            messageCache.set(msg.id, msg);
            const doc = (msg.media as Api.MessageMediaDocument).document as Api.Document;
            const fAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
            const vAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeVideo) as Api.DocumentAttributeVideo;
            return {
                messageId: msg.id, name: fAttr?.fileName || "File", size: Number(doc.size),
                date: msg.date, mimeType: doc.mimeType, downloadStatus: 'IDLE',
                downloadProgress: 0, isVideo: doc.mimeType.startsWith('video/') || !!vAttr,
                duration: vAttr?.duration || 0,
                thumbnail: doc.thumbs?.find(t => t instanceof Api.PhotoSize) ? msg : undefined
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

export async function downloadFileFromTelegram(messageId: number, onProgress: (p: number) => void) {
    const client = await telegramService.init();
    const msgs = await client.getMessages("me", { ids: [messageId] });
    return await client.downloadMedia(msgs[0], {
        workers: 16,
        progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
    });
}

export async function deleteFileFromTelegram(messageId: number) {
    const client = await telegramService.init();
    await client.deleteMessages("me", [messageId], { revoke: true });
}