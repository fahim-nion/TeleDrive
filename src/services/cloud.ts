import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile } from "../types";

// Internal state for the service
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

/**
 * FIXED: Decoupled Thumbnail API
 * Providing only messageId ensures React state stays light.
 */
export async function getThumbnail(messageId: number): Promise<string | null> {
    const cacheKey = `thumb_v7:${messageId}:s`;

    // 1. Check persistent disk cache
    const cached = await cacheService.getThumbnail(cacheKey);
    if (cached) return cached;

    // 2. Check if this specific thumbnail is already being downloaded
    if (inflightThumbs.has(messageId)) return inflightThumbs.get(messageId)!;

    const downloadPromise = new Promise<string | null>((resolve) => {
        const startDownload = async () => {
            try {
                const client = telegramService.client;
                if (!client) throw new Error("Client not ready");

                // Get message from cache or fetch if missing
                let msg = messageCache.get(messageId);
                if (!msg) {
                    const msgs = await client.getMessages("me", { ids: [messageId] });
                    msg = msgs[0];
                    if (msg) messageCache.set(messageId, msg);
                }

                if (!msg || !msg.media) return resolve(null);

                // Target the smallest possible thumbnail ('s')
                // Using 'thumb' parameter which is verified for GramJS 2.26.15
                const buffer = await client.downloadMedia(msg, {
                    thumb: 's' 
                });

                if (buffer) {
                    console.debug(`[GALLERY THUMB] msgId=${messageId} size=s bytes=${buffer.length}`);
                    await cacheService.setThumbnail(cacheKey, buffer as any);
                    resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
                } else {
                    resolve(null);
                }
            } catch (err) {
                console.error(`[GALLERY THUMB] Error for ${messageId}:`, err);
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
    const messages = await client.getMessages("me", { limit: 50, offsetId });
    
    return messages
        .filter(msg => msg.media instanceof Api.MessageMediaDocument || msg.media instanceof Api.MessageMediaPhoto)
        .map(msg => {
            // Save to internal cache for subsequent getThumbnail calls
            messageCache.set(msg.id, msg);

            let fileName = "Unknown", size = 0, isVideo = false, duration = 0, mimeType = "";

            if (msg.media instanceof Api.MessageMediaDocument) {
                const doc = msg.media.document as Api.Document;
                const fAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
                const vAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeVideo) as Api.DocumentAttributeVideo;
                fileName = fAttr?.fileName || "File";
                size = Number(doc.size);
                isVideo = doc.mimeType.startsWith('video/') || !!vAttr;
                duration = vAttr?.duration || 0;
                mimeType = doc.mimeType;
            } else if (msg.media instanceof Api.MessageMediaPhoto) {
                fileName = `Photo_${msg.id}.jpg`;
                mimeType = "image/jpeg";
                const largest = msg.media.photo.sizes.slice(-1)[0];
                size = (largest as any).size || 0;
            }

            return {
                messageId: msg.id,
                name: fileName,
                size,
                date: msg.date,
                mimeType,
                downloadStatus: 'IDLE',
                downloadProgress: 0,
                isVideo
            };
        });
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
    messageCache.delete(messageId);
}

// Obsolete logic removal placeholders
export const getTotalStorageStats = async () => ({ total: 0, photos: 0, videos: 0 });