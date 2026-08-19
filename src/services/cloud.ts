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

// Internal Helper for Atomic Download
async function atomicFetch(doc: Api.Document, sizeType: string): Promise<Uint8Array | null> {
    const client = telegramService.client;
    if (!client) return null;
    return await client.downloadFile(
        new Api.InputDocumentFileLocation({
            id: doc.id,
            accessHash: doc.accessHash,
            fileReference: doc.fileReference,
            thumbSize: sizeType as any
        }),
        { workers: 1 }
    );
}

/**
 * 1. GALLERY THUMBNAIL (Smallest 's' size)
 */
export async function getThumbnail(messageId: number): Promise<string | null> {
    const cacheKey = `thumb_v10_atomic:${messageId}`;
    const cached = await cacheService.getThumbnail(cacheKey);
    if (cached) return cached;
    if (inflightThumbs.has(messageId)) return inflightThumbs.get(messageId)!;

    const downloadPromise = new Promise<string | null>((resolve) => {
        const startDownload = async () => {
            try {
                const msg = messageCache.get(messageId);
                if (!msg || !(msg.media instanceof Api.MessageMediaDocument)) return resolve(null);
                const doc = msg.media.document as Api.Document;
                const target = doc.thumbs?.find(t => t instanceof Api.PhotoSize && t.type === 's') || doc.thumbs?.find(t => t instanceof Api.PhotoSize);
                if (!target) return resolve(null);

                const buffer = await atomicFetch(doc, (target as Api.PhotoSize).type);
                if (buffer) {
                    await cacheService.setThumbnail(cacheKey, buffer as any);
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
 * 2. OPTIMIZED PREVIEW (High-res 'x' or 'y' size for viewer)
 */
export async function getOptimizedPreview(messageId: number): Promise<string | null> {
    const msg = messageCache.get(messageId);
    if (!msg || !(msg.media instanceof Api.MessageMediaDocument)) return null;
    const doc = msg.media.document as Api.Document;
    
    // Look for high-res thumbnails (x, y, w) instead of full file
    const target = doc.thumbs?.find(t => t instanceof Api.PhotoSize && ['x', 'y', 'w'].includes(t.type)) as Api.PhotoSize;
    if (!target) return null;

    const buffer = await atomicFetch(doc, target.type);
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
                duration: vAttr?.duration || 0
            };
        });
}

/**
 * 3. FIX STORAGE METRICS SCANNER
 */
export async function getTotalStorageStats(): Promise<{ total: number, photos: number, videos: number }> {
    const client = await telegramService.init();
    let total = 0, photos = 0, videos = 0;
    // Scan up to 1000 messages to get accurate history
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
        workers: 12, // Keep original download fast
        progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
    });
}

export async function deleteFileFromTelegram(messageId: number) {
    const client = await telegramService.init();
    await client.deleteMessages("me", [messageId], { revoke: true });
}