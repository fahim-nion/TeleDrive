import { Api } from "telegram";
import { telegramService } from "./telegram";
import { cacheService } from "./cache";
import { CloudFile, FileCategory, StorageMetricsData } from "../types";
import { renderThumbnailCanvas } from "./upload";

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

// Queue for large images (>9.99MB) that lack server-side thumbnails
const largeThumbQueue: (() => void)[] = [];
let activeLargeDownloads = 0;
const MAX_LARGE_CONCURRENT = 1;

const processLargeQueue = () => {
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

// Fallback generator for images >9.99MB where Telegram server omitted doc.thumbs
async function generateFallbackThumbnailForLargeImage(
  msg: Api.Message, 
  doc: Api.Document, 
  fileName: string, 
  cacheKey: string
): Promise<string | null> {
  const client = telegramService.client;
  if (!client) return null;

  return new Promise<string | null>((resolve) => {
    const task = async () => {
      try {
        // Download over MTProto with parallel workers
        const buffer = await client.downloadMedia(msg, { workers: 4 });
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
  const cached = await cacheService.getThumbnail(cacheKey);
  if (cached) return cached;
  if (inflightThumbs.has(messageId)) return inflightThumbs.get(messageId)!;

  const downloadPromise = new Promise<string | null>((resolve) => {
    const startDownload = async () => {
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
        if (!msg || !msg.media) return resolve(null);

        const client = telegramService.client;
        if (!client) return resolve(null);

        if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
          const doc = msg.media.document;
          const thumb = doc.thumbs?.find((t: any) => t instanceof Api.PhotoSize && t.type !== 'i') || doc.thumbs?.[0];

          if (thumb) {
            // Case A: Telegram provided a server thumbnail (typical for files <= 9.99 MB or client-thumb uploads)
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
            // Case B: Telegram has NO server thumbnail (files > 9.99 MB)
            const fAttr = doc.attributes?.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename | undefined;
            const fileName = fAttr?.fileName || '';
            const mime = doc.mimeType || '';
            const isImage = mime.startsWith('image/') || fileName.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|heic|bmp|tiff|avif)$/) !== null;

            // If it's an image and reasonable size (<= 60MB), generate client thumbnail and cache permanently
            const fileSize = Number(doc.size || 0);
            if (isImage && fileSize <= 60 * 1024 * 1024) {
              const fallbackUrl = await generateFallbackThumbnailForLargeImage(msg, doc, fileName, cacheKey);
              resolve(fallbackUrl);
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
