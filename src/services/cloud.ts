import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile } from "../types";

// Strict Concurrency Control
const MAX_CONCURRENT_DOWNLOADS = 4;
let activeDownloads = 0;
const downloadQueue: (() => void)[] = [];

const processQueue = () => {
    while (downloadQueue.length > 0 && activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
        const next = downloadQueue.shift();
        if (next) {
            activeDownloads++;
            next();
        }
    }
};

/**
 * Extracts the ultra-small blurry preview embedded in Telegram metadata.
 * This requires ZERO network requests.
 */
function getStrippedThumb(doc: Api.Document): string | null {
    const stripped = doc.thumbs?.find(t => t instanceof Api.PhotoStrippedSize) as Api.PhotoStrippedSize;
    if (!stripped) return null;
    
    // Standard JPEG header for Telegram stripped thumbs
    const header = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x28, 0x1c, 0x1e, 0x23, 0x1e, 0x19, 0x28, 0x23, 0x21, 0x23, 0x2d, 0x2b, 0x28, 0x30, 0x3c, 0x50, 0x34, 0x30, 0x2d, 0x2d, 0x3c, 0x7b, 0x58, 0x5d, 0x49, 0x50, 0x73, 0x66, 0x78, 0x76, 0x73, 0x66, 0x71, 0x82, 0x93, 0xbc, 0xa1, 0x82, 0x89, 0xb1, 0x8c, 0x71, 0x76, 0xa2, 0xdd, 0xa5, 0xb1, 0xc1, 0xc8, 0xcd, 0xcd, 0xcd, 0x7c, 0x99, 0xe1, 0xf0, 0xe1, 0xc6, 0xef, 0xaf, 0xcd, 0xcd, 0xcd, 0xff, 0xc0, 0x00, 0x11, 0x08
    ]);
    const footer = Buffer.from([0xff, 0xd9]);
    return `data:image/jpeg;base64,${Buffer.concat([header, Buffer.from([stripped.bytes.length]), stripped.bytes, footer]).toString('base64')}`;
}

export async function getThumbnail(message: Api.Message): Promise<string | null> {
    const cacheKey = `thumb_v4:${message.id}`;
    const cached = await cacheService.getThumbnail(cacheKey);
    if (cached) return cached;

    return new Promise((resolve) => {
        const task = async () => {
            try {
                const client = telegramService.client;
                if (!client) throw new Error("No Client");
                
                // Request 'm' size (medium) thumbnail specifically
                const buffer = await client.downloadMedia(message, { thumbClass: "m" });
                if (buffer) {
                    await cacheService.setThumbnail(cacheKey, buffer as any);
                    resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
                } else resolve(null);
            } catch (err) {
                console.error(`[Thumbnail] Failed for ${message.id}`, err);
                resolve(null);
            } finally {
                activeDownloads--;
                processQueue();
            }
        };
        downloadQueue.push(task);
        processQueue();
    });
}

export async function fetchCloudFiles(offsetId: number = 0): Promise<CloudFile[]> {
    const client = await telegramService.init();
    console.log(`[Gallery] Fetching 50 items with offset: ${offsetId}`);
    
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
                instantThumb: getStrippedThumb(doc) // Tier 1: Instant Blur
            };
        });
}

export async function downloadFileFromTelegram(messageId: number, onProgress: (p: number) => void) {
    const client = await telegramService.init();
    const fetchFresh = async () => {
        const msgs = await client.getMessages("me", { ids: [messageId] });
        return msgs[0];
    };

    let msg = await fetchFresh();
    try {
        return await client.downloadMedia(msg, {
            progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
        });
    } catch (err: any) {
        if (err.message.includes('REFERENCE')) {
            console.warn(`[Recovery] Token expired for ${messageId}, refreshing...`);
            msg = await fetchFresh();
            return await client.downloadMedia(msg, {
                progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
            });
        }
        throw err;
    }
}