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
    const cacheKey = `th_v13_stable:${messageId}`;
    const cached = await cacheService.getThumbnail(cacheKey);
    if (cached) return cached;
    if (inflightThumbs.has(messageId)) return inflightThumbs.get(messageId)!;

    const downloadPromise = new Promise<string | null>((resolve) => {
        const startDownload = async () => {
            try {
                const msg = messageCache.get(messageId);
                if (!msg || !msg.media) return resolve(null);

                const doc = (msg.media as any).document as Api.Document;
                if (!doc) return resolve(null);

                // FIXED: Explicitly find JPEG-compatible PhotoSize for HEIC and others
                const thumb = doc.thumbs?.find(t => t instanceof Api.PhotoSize && t.type !== 'i');
                if (!thumb) return resolve(null);

                const client = telegramService.client;
                if (!client) return resolve(null);

                const buffer = await client.downloadFile(
                    new Api.InputDocumentFileLocation({
                        id: doc.id,
                        accessHash: doc.accessHash,
                        fileReference: doc.fileReference,
                        thumbSize: (thumb as any).type
                    }),
                    { workers: 1 }
                );

                if (buffer && buffer.length > 0) {
                    await cacheService.setThumbnail(cacheKey, buffer as any);
                    resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
                } else resolve(null);
            } catch (err) { resolve(null); }
            finally { activeDownloads--; inflightThumbs.delete(messageId); processQueue(); }
        };
        thumbQueue.push(startDownload);
        processQueue();
    });

    inflightThumbs.set(messageId, downloadPromise);
    return downloadPromise;
}

export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
    const client = await telegramService.init();
    // Use limit of 60 for stability
    const messages = await client.getMessages("me", { limit: 60, offsetId });
    
    return messages.filter(msg => msg.media instanceof Api.MessageMediaDocument).map(msg => {
        messageCache.set(msg.id, msg);
        const doc = (msg.media as Api.MessageMediaDocument).document as Api.Document;
        const fAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
        const vAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeVideo) as Api.DocumentAttributeVideo;
        
        return {
            messageId: msg.id,
            name: fAttr?.fileName || "File",
            size: Number(doc.size),
            date: msg.date,
            mimeType: doc.mimeType,
            downloadStatus: 'IDLE',
            downloadProgress: 0,
            isVideo: doc.mimeType.startsWith('video/') || !!vAttr,
            duration: vAttr?.duration || 0,
            thumbnail: (doc.thumbs && doc.thumbs.length > 0) ? msg : undefined
        };
    });
}

export async function getTotalStorageStats(): Promise<{ total: number, photos: number, videos: number }> {
    const client = await telegramService.init();
    let total = 0, photos = 0, videos = 0;
    
    try {
        // Increased limit to 500 for a deeper historical scan
        const messages = await client.getMessages("me", { limit: 500 }); 
        
        for (const msg of messages) {
            if (msg.media instanceof Api.MessageMediaDocument) {
                const doc = msg.media.document as Api.Document;
                const size = Number(doc.size);
                const isVid = doc.mimeType.startsWith('video/') || doc.attributes.some(a => a instanceof Api.DocumentAttributeVideo);
                
                total += size;
                if (isVid) videos += size; else photos += size;
                
            } else if (msg.media instanceof Api.MessageMediaPhoto && msg.media.photo instanceof Api.Photo) {
                // Support for native Telegram photos
                const sizes = msg.media.photo.sizes;
                const largest = sizes[sizes.length - 1];
                const size = (largest as any).size || 0;
                
                total += size;
                photos += size;
            }
        }
    } catch (e) {
        console.error("Metric scan partially failed:", e);
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

export async function getOptimizedPreview(messageId: number): Promise<string | null> {
    try {
        const msg = messageCache.get(messageId);
        if (!msg || !msg.media) return null;

        const doc = (msg.media as any).document as Api.Document;
        if (!doc) return null;

        // QUALITY UPGRADE: Prioritize 'w' (2560px) for Retina displays, then 'y' (1280px)
        const target = doc.thumbs?.find(t => t instanceof Api.PhotoSize && t.type === 'w')
                    || doc.thumbs?.find(t => t instanceof Api.PhotoSize && t.type === 'y')
                    || doc.thumbs?.find(t => t instanceof Api.PhotoSize && t.type === 'x')
                    || doc.thumbs?.find(t => t instanceof Api.PhotoSize && t.type === 'm');

        if (!target) return null;

        const client = telegramService.client;
        if (!client) return null;

        console.log(`[Viewer HD] Fetching high-res preview: type=${(target as any).type}`);

        const buffer = await client.downloadFile(
            new Api.InputDocumentFileLocation({
                id: doc.id,
                accessHash: doc.accessHash,
                fileReference: doc.fileReference,
                thumbSize: (target as any).type
            }),
            { workers: 1 }
        );

        return buffer ? URL.createObjectURL(new Blob([buffer as any], { type: 'image/jpeg' })) : null;
    } catch (e) {
        console.error("HD Preview fetch failed", e);
        return null;
    }
}

export async function deleteFileFromTelegram(messageId: number) {
    const client = await telegramService.init();
    await client.deleteMessages("me", [messageId], { revoke: true });
}