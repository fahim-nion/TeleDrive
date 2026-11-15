import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile, FileCategory, StorageMetricsData } from "../types";
import { renderThumbnailCanvas } from "./upload";

const messageCache = new Map<number, Api.Message>();
const inflightThumbs = new Map<number, Promise<string | null>>();

// ⚡ PRIORITY 1: FAST QUEUE (Exclusively for <= 9.99MB server thumbnails & photos)
const fastThumbQueue: (() => void)[] = [];
let activeFastDownloads = 0;
const MAX_FAST_CONCURRENT = 6; // High throughput lightning speed

const processFastQueue = () => {
  if (fastThumbQueue.length > 0 && activeFastDownloads < MAX_FAST_CONCURRENT) {
    activeFastDownloads++;
    const next = fastThumbQueue.shift();
    if (next) next();
  }
};

// 🐢 PRIORITY 2: BACKGROUND QUEUE (Exclusively for >9.99MB images missing server thumbnails)
const largeThumbQueue: (() => void)[] = [];
let activeLargeDownloads = 0;
const MAX_LARGE_CONCURRENT = 1;

const processLargeQueue = () => {
  // Yield network priority to fast thumbnails if any are pending or active
  if (fastThumbQueue.length > 0 || activeFastDownloads > 0) {
    setTimeout(processLargeQueue, 250);
    return;
  }
  if (largeThumbQueue.length > 0 && activeLargeDownloads < MAX_LARGE_CONCURRENT) {
    activeLargeDownloads++;
    const next = largeThumbQueue.shift();
    if (next) next();
  }
};

export function categorizeFile(mimeType: string, fileName: string): FileCategory {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (
    lowerMime.startsWith('image/') ||
    lowerName.match(/\.(jpe?g|png|gif|webp|svg|heic|heif|bmp|tiff|avif|ico)$/)
  ) {
    return 'image';
  }

  if (
    lowerMime.startsWith('video/') ||
    lowerName.match(/\.(mp4|mkv|mov|avi|webm|flv|wmv|m4v|3gp|ts)$/)
  ) {
    return 'video';
  }

  if (
    lowerMime.startsWith('audio/') ||
    lowerName.match(/\.(mp3|wav|ogg|m4a|flac|aac|opus|wma|aiff)$/)
  ) {
    return 'audio';
  }

  if (
    lowerMime.includes('pdf') ||
    lowerMime.includes('word') ||
    lowerMime.includes('officedocument') ||
    lowerMime.includes('text') ||
    lowerMime.includes('sheet') ||
    lowerMime.includes('presentation') ||
    lowerName.match(/\.(pdf|docx?|xlsx?|pptx?|txt|md|csv|rtf|epub|odt|ods|odp)$/)
  ) {
    return 'document';
  }

  if (
    lowerMime.includes('zip') ||
    lowerMime.includes('compressed') ||
    lowerMime.includes('tar') ||
    lowerName.match(/\.(zip|rar|7z|tar|gz|bz2|xz|iso|dmg|tgz)$/)
  ) {
    return 'archive';
  }

  return 'other';
}

export function parseCloudFile(msg: Api.Message): CloudFile | null {
  if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
    const doc = msg.media.document;
    const fAttr = doc.attributes?.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename | undefined;
    const vAttr = doc.attributes?.find(a => a instanceof Api.DocumentAttributeVideo) as Api.DocumentAttributeVideo | undefined;
    const aAttr = doc.attributes?.find(a => a instanceof Api.DocumentAttributeAudio) as Api.DocumentAttributeAudio | undefined;

    let fileName = fAttr?.fileName;
    if (!fileName && aAttr?.title) {
      fileName = `${aAttr.performer ? aAttr.performer + ' - ' : ''}${aAttr.title}.mp3`;
    }
    if (!fileName) {
      const ext = doc.mimeType?.split('/')[1] || 'bin';
      fileName = `file_${msg.id}.${ext}`;
    }

    const mime = doc.mimeType || 'application/octet-stream';
    const isVideo = mime.startsWith('video/') || !!vAttr;
    const isAudio = mime.startsWith('audio/') || !!aAttr;
    const isImage = mime.startsWith('image/') || fileName.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|heic|bmp|avif)$/) !== null;
    const category = categorizeFile(mime, fileName);

    return {
      messageId: msg.id,
      name: fileName,
      size: Number(doc.size || 0),
      date: msg.date,
      mimeType: fileName.toLowerCase().endsWith('.heic') ? 'image/heic' : mime,
      category,
      downloadStatus: 'IDLE',
      downloadProgress: 0,
      isVideo,
      isAudio,
      isImage,
      duration: vAttr?.duration || aAttr?.duration || 0,
    };
  } else if (msg.media instanceof Api.MessageMediaPhoto && msg.media.photo instanceof Api.Photo) {
    const photo = msg.media.photo;
    let size = 0;
    if (photo.sizes && photo.sizes.length > 0) {
      const largest = photo.sizes[photo.sizes.length - 1];
      if ((largest as any).size) {
        size = (largest as any).size;
      } else if ((largest as any).sizes && Array.isArray((largest as any).sizes)) {
        size = (largest as any).sizes.reduce((a: number, b: number) => a + b, 0);
      } else if ((largest as any).bytes) {
        size = (largest as any).bytes.length;
      } else {
        size = 850 * 1024;
      }
    }

    return {
      messageId: msg.id,
      name: `Photo_${msg.id}.jpg`,
      size,
      date: msg.date,
      mimeType: 'image/jpeg',
      category: 'image',
      downloadStatus: 'IDLE',
      downloadProgress: 0,
      isVideo: false,
      isAudio: false,
      isImage: true,
      duration: 0,
    };
  }
  return null;
}

// Background generator for images >9.99MB (isolated from fast queue)
async function generateFallbackThumbnailForLargeImage(
  msg: Api.Message, 
  doc: Api.Document, 
  fileName: string, 
  cacheKey: string
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const task = async () => {
      try {
        const client = telegramService.client;
        if (!client) return resolve(null);

        // Download media with low-impact parallel workers
        const buffer = await client.downloadMedia(msg, { workers: 2 });
        if (!buffer || buffer.length === 0) {
          return resolve(null);
        }

        let sourceBlob = new Blob([buffer], { type: doc.mimeType || 'image/jpeg' });

        // If HEIC image, transcode to JPEG blob first
        if (fileName.toLowerCase().endsWith('.heic')) {
          try {
            const heicModule = await import('heic2any');
            const heic2any = heicModule.default || heicModule;
            const converted = await heic2any({ blob: sourceBlob, toType: 'image/jpeg', quality: 0.7 });
            sourceBlob = Array.isArray(converted) ? converted[0] : converted;
          } catch (e) {
            console.warn("Fallback HEIC conversion skipped:", e);
          }
        }

        // Render compact 320px thumbnail
        const thumbArrayBuf = await renderThumbnailCanvas(sourceBlob, 320, 0.75);
        if (thumbArrayBuf) {
          await cacheService.setThumbnail(cacheKey, thumbArrayBuf);
          return resolve(URL.createObjectURL(new Blob([thumbArrayBuf], { type: 'image/jpeg' })));
        }
        resolve(null);
      } catch (err) {
        console.warn("Could not generate fallback thumbnail for image >10MB:", fileName, err);
        resolve(null);
      } finally {
        activeLargeDownloads--;
        processLargeQueue();
      }
    };

    largeThumbQueue.push(task);
    processLargeQueue();
  });
}

export async function getThumbnail(messageId: number): Promise<string | null> {
  const cacheKey = `th_v14:${messageId}`;

  // 1. Instant local disk cache hit (0 ms)
  const cached = await cacheService.getThumbnail(cacheKey);
  if (cached) return cached;

  // 2. Inflight check
  if (inflightThumbs.has(messageId)) return inflightThumbs.get(messageId)!;

  let msg = messageCache.get(messageId);

  // Check if this is an image >9.99MB with NO server thumbnail
  let isLargeImageWithoutServerThumb = false;
  let docRef: Api.Document | null = null;
  let fileNameRef = '';

  if (msg?.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
    docRef = msg.media.document;
    const hasServerThumb = !!(docRef.thumbs?.find((t: any) => t instanceof Api.PhotoSize && t.type !== 'i') || docRef.thumbs?.[0]);
    if (!hasServerThumb) {
      const fAttr = docRef.attributes?.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename | undefined;
      fileNameRef = fAttr?.fileName || '';
      const mime = docRef.mimeType || '';
      const isImg = mime.startsWith('image/') || fileNameRef.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|heic|bmp|tiff|avif)$/) !== null;
      if (isImg && Number(docRef.size || 0) <= 60 * 1024 * 1024) {
        isLargeImageWithoutServerThumb = true;
      }
    }
  }

  // IF LARGE IMAGE (>9.99MB) WITHOUT SERVER THUMBNAIL:
  // Route to the independent background queue so it NEVER blocks normal thumbnails!
  if (isLargeImageWithoutServerThumb && docRef && msg) {
    const largePromise = generateFallbackThumbnailForLargeImage(msg, docRef, fileNameRef, cacheKey);
    inflightThumbs.set(messageId, largePromise);
    largePromise.finally(() => inflightThumbs.delete(messageId));
    return largePromise;
  }

  // OTHERWISE: FAST PATH (LIGHTNING SPEED FOR <= 9.99MB FILES)
  const fastPromise = new Promise<string | null>((resolve) => {
    const startFastDownload = async () => {
      try {
        if (!msg) {
          const client = await telegramService.init();
          const msgs = await client.getMessages("me", { ids: [messageId] });
          if (msgs && msgs.length > 0) {
            msg = msgs[0];
            messageCache.set(messageId, msg);
          }
        }
        if (!msg || !msg.media) return resolve(null);

        const client = telegramService.client;
        if (!client) return resolve(null);

        if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
          const doc = msg.media.document;
          const thumb = doc.thumbs?.find((t: any) => t instanceof Api.PhotoSize && t.type !== 'i') || doc.thumbs?.[0];

          if (thumb) {
            // LIGHTNING FAST PATH: Download 5KB PhotoSize via InputDocumentFileLocation
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
            } else {
              resolve(null);
            }
          } else {
            // No server thumb and not in cache: immediately release fast queue
            const fAttr = doc.attributes?.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename | undefined;
            const fileName = fAttr?.fileName || '';
            const mime = doc.mimeType || '';
            const isImg = mime.startsWith('image/') || fileName.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|heic|bmp|tiff|avif)$/) !== null;

            if (isImg && Number(doc.size || 0) <= 60 * 1024 * 1024) {
              // Trigger background queue asynchronously without holding the fast queue slot!
              generateFallbackThumbnailForLargeImage(msg, doc, fileName, cacheKey)
                .then(resolve)
                .catch(() => resolve(null));
            } else {
              resolve(null);
            }
          }
        } else if (msg.media instanceof Api.MessageMediaPhoto && msg.media.photo instanceof Api.Photo) {
          const photo = msg.media.photo;
          const thumb = photo.sizes?.find((s: any) => s.type === 'm' || s.type === 's' || s.type === 'x') || photo.sizes?.[0];
          if (!thumb) return resolve(null);

          const buffer = await client.downloadFile(
            new Api.InputPhotoFileLocation({
              id: photo.id,
              accessHash: photo.accessHash,
              fileReference: photo.fileReference,
              thumbSize: (thumb as any).type
            }),
            { workers: 1 }
          );

          if (buffer && buffer.length > 0) {
            await cacheService.setThumbnail(cacheKey, buffer as any);
            resolve(URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      } catch (err) {
        resolve(null);
      } finally {
        activeFastDownloads--;
        inflightThumbs.delete(messageId);
        processFastQueue();
      }
    };

    fastThumbQueue.push(startFastDownload);
    processFastQueue();
  });

  inflightThumbs.set(messageId, fastPromise);
  return fastPromise;
}

export async function getOptimizedPreview(messageId: number): Promise<string | null> {
  try {
    let msg = messageCache.get(messageId);
    if (!msg) {
      const client = await telegramService.init();
      const msgs = await client.getMessages("me", { ids: [messageId] });
      if (msgs && msgs.length > 0) {
        msg = msgs[0];
        messageCache.set(messageId, msg);
      }
    }
    if (!msg || !msg.media) return null;

    const client = telegramService.client;
    if (!client) return null;

    if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
      const doc = msg.media.document;
      const target = doc.thumbs?.find((t: any) => t instanceof Api.PhotoSize && ['y', 'w', 'x'].includes(t.type))
                  || doc.thumbs?.find((t: any) => t instanceof Api.PhotoSize && t.type === 'm');
      if (!target) return null;

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
    } else if (msg.media instanceof Api.MessageMediaPhoto && msg.media.photo instanceof Api.Photo) {
      const photo = msg.media.photo;
      const target = photo.sizes?.find((s: any) => ['y', 'w', 'x', 'm'].includes(s.type)) || photo.sizes?.[0];
      if (!target) return null;

      const buffer = await client.downloadFile(
        new Api.InputPhotoFileLocation({
          id: photo.id,
          accessHash: photo.accessHash,
          fileReference: photo.fileReference,
          thumbSize: (target as any).type
        }),
        { workers: 1 }
      );
      return buffer ? URL.createObjectURL(new Blob([buffer as any], { type: 'image/jpeg' })) : null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function fetchCloudFiles(offsetId: number = 0, limit: number = 60): Promise<CloudFile[]> {
  const client = await telegramService.init();
  const messages = await client.getMessages("me", { limit, offsetId });
  
  const parsedFiles: CloudFile[] = [];
  for (const msg of messages) {
    const parsed = parseCloudFile(msg);
    if (parsed) {
      messageCache.set(msg.id, msg);
      parsedFiles.push(parsed);
    }
  }

  // Cache files in IndexedDB
  if (parsedFiles.length > 0) {
    cacheService.saveCachedFiles(parsedFiles).catch(() => {});
  }

  return parsedFiles;
}

export async function getTotalStorageStats(
  forceRescan: boolean = false,
  onProgress?: (scanned: number, totalFound: number) => void
): Promise<StorageMetricsData> {
  if (!forceRescan) {
    const cached = await cacheService.getCachedStats();
    if (cached && cached.totalCount > 0 && Date.now() - cached.lastUpdated < 10 * 60 * 1000) {
      return cached;
    }
  }

  const client = await telegramService.init();

  let totalBytes = 0;
  let photoBytes = 0;
  let videoBytes = 0;
  let docBytes = 0;
  let audioBytes = 0;
  let otherBytes = 0;

  let totalCount = 0;
  let photoCount = 0;
  let videoCount = 0;
  let docCount = 0;
  let audioCount = 0;
  let otherCount = 0;

  let offsetId = 0;
  let messagesScanned = 0;
  const CHUNK_LIMIT = 100;
  const MAX_MESSAGES = 2000;
  const allParsed: CloudFile[] = [];

  try {
    while (messagesScanned < MAX_MESSAGES) {
      const messages = await client.getMessages("me", {
        limit: CHUNK_LIMIT,
        offsetId,
      });

      if (!messages || messages.length === 0) break;

      for (const msg of messages) {
        const parsed = parseCloudFile(msg);
        if (parsed) {
          messageCache.set(msg.id, msg);
          allParsed.push(parsed);

          totalBytes += parsed.size;
          totalCount++;

          switch (parsed.category) {
            case 'image':
              photoBytes += parsed.size;
              photoCount++;
              break;
            case 'video':
              videoBytes += parsed.size;
              videoCount++;
              break;
            case 'document':
              docBytes += parsed.size;
              docCount++;
              break;
            case 'audio':
              audioBytes += parsed.size;
              audioCount++;
              break;
            default:
              otherBytes += parsed.size;
              otherCount++;
              break;
          }
        }
      }

      messagesScanned += messages.length;
      offsetId = messages[messages.length - 1].id;

      if (onProgress) {
        onProgress(messagesScanned, totalCount);
      }

      if (messages.length < CHUNK_LIMIT) break;
    }

    const finalStats: StorageMetricsData = {
      totalBytes,
      photoBytes,
      videoBytes,
      docBytes,
      audioBytes,
      otherBytes,
      totalCount,
      photoCount,
      videoCount,
      docCount,
      audioCount,
      otherCount,
      lastUpdated: Date.now(),
      isScanning: false,
    };

    await cacheService.saveCachedStats(finalStats);
    if (allParsed.length > 0) {
      await cacheService.saveCachedFiles(allParsed);
    }

    return finalStats;
  } catch (e) {
    console.error("Metric scan partially failed:", e);
    return cacheService.getInitialStatsSync();
  }
}

export async function downloadFileFromTelegram(
  messageId: number,
  onProgress?: (p: number) => void
): Promise<Uint8Array | Buffer> {
  const client = await telegramService.init();
  let msg = messageCache.get(messageId);
  if (!msg) {
    const msgs = await client.getMessages("me", { ids: [messageId] });
    if (msgs && msgs.length > 0) {
      msg = msgs[0];
      messageCache.set(messageId, msg);
    }
  }

  if (!msg) throw new Error("File not found on Telegram");

  const buffer = await client.downloadMedia(msg, {
    progressCallback: (t, d) => {
      const total = Number(t);
      const done = Number(d);
      if (total > 0 && onProgress) {
        onProgress(Math.min(100, Math.round((done / total) * 100)));
      }
    }
  });

  return buffer as any;
}

export async function deleteFileFromTelegram(messageId: number): Promise<void> {
  const client = await telegramService.init();
  await client.deleteMessages("me", [messageId], { revoke: true });
  messageCache.delete(messageId);
  await cacheService.removeCachedFile(messageId);
}

export async function deleteMultipleFilesFromTelegram(messageIds: number[]): Promise<void> {
  const client = await telegramService.init();
  await client.deleteMessages("me", messageIds, { revoke: true });
  for (const id of messageIds) {
    messageCache.delete(id);
    await cacheService.removeCachedFile(id);
  }
}
