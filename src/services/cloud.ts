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
    const cacheKey = `thumb_v9_atomic:${messageId}`;
    const cached = await cacheService.getThumbnail(cacheKey);
    if (cached) return cached;
    if (inflightThumbs.has(messageId)) return inflightThumbs.get(messageId)!;

    const downloadPromise = new Promise<string | null>((resolve) => {
        const startDownload = async () => {
            try {
                const client = telegramService.client;
                const msg = messageCache.get(messageId);
                if (!client || !msg || !(msg.media instanceof Api.MessageMediaDocument)) return resolve(null);

                const doc = msg.media.document as Api.Document;
                const validThumb = doc.thumbs?.find(t => t instanceof Api.PhotoSize) as Api.PhotoSize;

                if (!validThumb) return resolve(null);

                // ATOMIC FIX: Use low-level downloadFile with explicit thumbSize
                // This BYPASSES all of GramJS's big-file logic.
                const buffer = await client.downloadFile(
                    new Api.InputDocumentFileLocation({
                        id: doc.id,
                        accessHash: doc.accessHash,
                        fileReference: doc.fileReference,
                        thumbSize: validThumb.type // e.g. 's' or 'm'
                    }),
                    { workers: 1 }
                );

                if (buffer && buffer.length > 0) {
                    console.log(`[GALLERY THUMB] RECEIVED ATOMIC: ${messageId} (${buffer.length} bytes)`);
                    await cacheService.setThumbnail(cacheKey, buffer as any);
                    resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
                } else resolve(null);

            } catch (err) {
                console.error(`[GALLERY THUMB] Atomic fetch failed for ${messageId}`, err);
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

// REST OF FILE STAYS THE SAME (fetchCloudFiles, downloadFileFromTelegram, etc)
export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
    const client = await telegramService.init();
    const messages = await client.getMessages("me", { limit: 50, offsetId });
    return messages.filter(msg => msg.media instanceof Api.MessageMediaDocument).map(msg => {
            messageCache.set(msg.id, msg);
            const doc = (msg.media as Api.MessageMediaDocument).document as Api.Document;
            const fAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
            const vAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeVideo) as Api.DocumentAttributeVideo;
            return {
                messageId: msg.id, name: fAttr?.fileName || "Unknown", size: Number(doc.size),
                date: msg.date, mimeType: doc.mimeType, downloadStatus: 'IDLE',
                downloadProgress: 0, isVideo: doc.mimeType.startsWith('video/') || !!vAttr,
                duration: vAttr?.duration || 0
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
    console.info(`[GALLERY ORIGINAL] FULL DOWNLOAD STARTED: ${messageId}`);
    const msgs = await client.getMessages("me", { ids: [messageId] });
    return await client.downloadMedia(msgs[0], {
        progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
    });
}

export async function deleteFileFromTelegram(messageId: number) {
    const client = await telegramService.init();
    await client.deleteMessages("me", [messageId], { revoke: true });
}