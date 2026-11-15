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

export function extractFileSize(rawSize: any): number {
  if (rawSize == null) return 0;
  if (typeof rawSize === 'number') return isNaN(rawSize) ? 0 : rawSize;
  if (typeof rawSize === 'bigint') return Number(rawSize);
  if (typeof rawSize === 'object') {
    if (typeof rawSize.toJSNumber === 'function') {
      try {
        const val = rawSize.toJSNumber();
        if (!isNaN(val) && val > 0) return val;
      } catch {}
    }
    if (typeof rawSize.toString === 'function') {
      const val = Number(rawSize.toString());
      if (!isNaN(val) && val > 0) return val;
    }
    if (typeof rawSize.value !== 'undefined') {
      const val = Number(rawSize.value);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  const parsed = Number(rawSize);
  return isNaN(parsed) ? 0 : parsed;
}

export function extractPhotoSize(photo: any): number {
  if (!photo || !photo.sizes || !Array.isArray(photo.sizes)) return 850 * 1024;
  let maxBytes = 0;

  for (const s of photo.sizes) {
    if (!s) continue;
    let sBytes = 0;

    // 1. PhotoSize with direct .size
    if (s.size != null) {
      sBytes = extractFileSize(s.size);
    }
    // 2. PhotoSizeProgressive with .sizes array
    else if (Array.isArray(s.sizes) && s.sizes.length > 0) {
      const last = s.sizes[s.sizes.length - 1];
      const maxInArr = Math.max(...s.sizes.map((v: any) => extractFileSize(v)));
      sBytes = Math.max(extractFileSize(last), maxInArr);
    }
    // 3. PhotoCachedSize with .bytes Buffer
    else if (s.bytes && (s.bytes.length || s.bytes.byteLength)) {
      const len = s.bytes.length || s.bytes.byteLength || 0;
      if (s.type !== 'i' && s.className !== 'PhotoStrippedSize') {
        sBytes = len;
      }
    }

    if (sBytes > maxBytes) {
      maxBytes = sBytes;
    }
  }

  // If no high-res size was found or sizes were all stripped (<1KB), fallback to 1.2MB photo average
  if (maxBytes < 1024) {
    return 1200 * 1024;
  }
  return maxBytes;
}

export function parseCloudFile(msg: Api.Message): CloudFile | null {
  if (!msg || !msg.media) return null;

  const media = msg.media;
  const isDocMedia = media instanceof Api.MessageMediaDocument || (media as any).className === 'MessageMediaDocument';
  const isPhotoMedia = media instanceof Api.MessageMediaPhoto || (media as any).className === 'MessageMediaPhoto';

  if (isDocMedia && (media as any).document && ((media as any).document instanceof Api.Document || (media as any).document.className === 'Document')) {
    const doc = (media as any).document as Api.Document;
    const fAttr = doc.attributes?.find(a => a instanceof Api.DocumentAttributeFilename || (a as any).className === 'DocumentAttributeFilename') as Api.DocumentAttributeFilename | undefined;
    const vAttr = doc.attributes?.find(a => a instanceof Api.DocumentAttributeVideo || (a as any).className === 'DocumentAttributeVideo') as Api.DocumentAttributeVideo | undefined;
    const aAttr = doc.attributes?.find(a => a instanceof Api.DocumentAttributeAudio || (a as any).className === 'DocumentAttributeAudio') as Api.DocumentAttributeAudio | undefined;
    const sAttr = doc.attributes?.find(a => a instanceof Api.DocumentAttributeSticker || (a as any).className === 'DocumentAttributeSticker');

    // Skip chat stickers that have no filename (chat stickers are not user cloud files)
    if (sAttr && !fAttr?.fileName) {
      return null;
    }

    const mime = doc.mimeType || 'application/octet-stream';
    let ext = '';
    if (fAttr?.fileName && fAttr.fileName.includes('.')) {
      ext = fAttr.fileName.split('.').pop() || '';
    } else {
      ext = mime.split('/')[1]?.split(';')[0] || 'bin';
      if (ext === 'octet-stream') ext = 'bin';
    }

    let fileName = fAttr?.fileName;
    if (!fileName) {
      if (aAttr?.title) {
        fileName = `${aAttr.performer ? aAttr.performer + ' - ' : ''}${aAttr.title}.${ext || 'mp3'}`;
      } else if (vAttr) {
        fileName = `Video_${msg.id}.${ext || 'mp4'}`;
      } else if (mime.startsWith('image/')) {
        fileName = `Image_${msg.id}.${ext || 'jpg'}`;
      } else if (aAttr) {
        fileName = `Audio_${msg.id}.${ext || 'mp3'}`;
      } else {
        fileName = `File_${msg.id}.${ext}`;
      }
    }

    const isVideo = mime.startsWith('video/') || !!vAttr;
    const isAudio = mime.startsWith('audio/') || !!aAttr;
    const isImage = mime.startsWith('image/') || fileName.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|heic|heif|bmp|avif)$/) !== null;
    const category = categorizeFile(mime, fileName);
    const size = extractFileSize(doc.size);

    return {
      messageId: msg.id,
      name: fileName,
      size,
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
  } else if (isPhotoMedia && (media as any).photo && ((media as any).photo instanceof Api.Photo || (media as any).photo.className === 'Photo')) {
    const photo = (media as any).photo as Api.Photo;
    const size = extractPhotoSize(photo);

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
  const parsedFiles: CloudFile[] = [];

  try {
    const iter = client.iterMessages("me", {
      offsetId: offsetId > 0 ? offsetId : undefined,
    });

    let rawInspected = 0;
    // Step through messages to gather target number of actual media files, skipping plain text
    const MAX_RAW_INSPECT = 400;

    for await (const msg of iter) {
      rawInspected++;
      const parsed = parseCloudFile(msg);
      if (parsed) {
        messageCache.set(msg.id, msg);
        parsedFiles.push(parsed);
        if (parsedFiles.length >= limit) {
          break;
        }
      }
      if (rawInspected >= MAX_RAW_INSPECT) {
        break;
      }
    }
  } catch (err) {
    console.warn("fetchCloudFiles error:", err);
  }

  // Cache files in IndexedDB
  if (parsedFiles.length > 0) {
    cacheService.saveCachedFiles(parsedFiles).catch(() => {});
  }

  return parsedFiles;
}

let activeScanPromise: Promise<StorageMetricsData> | null = null;

export async function getTotalStorageStats(
  forceRescan: boolean = false,
  onProgress?: (scanned: number, totalFound: number, currentBytes: number, stats: StorageMetricsData) => void
): Promise<StorageMetricsData> {
  // If a scan is already actively running and the caller isn't strictly forcing a new parallel run, reuse it
  if (activeScanPromise && !forceRescan) {
    return activeScanPromise;
  }

  // Check cached stats if not forcing a rescan
  if (!forceRescan) {
    const cached = await cacheService.getCachedStats();
    if (
      cached &&
      cached.scannedAllHistory &&
      cached.totalCount > 0 &&
      Date.now() - cached.lastUpdated < 15 * 60 * 1000
    ) {
      return cached;
    }
  }

  const runScan = async (): Promise<StorageMetricsData> => {
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

    let messagesScanned = 0;
    const allParsed: CloudFile[] = [];

    // Trigger initial scanning notification
    if (onProgress) {
      onProgress(0, 0, 0, {
        totalBytes: 0,
        photoBytes: 0,
        videoBytes: 0,
        docBytes: 0,
        audioBytes: 0,
        otherBytes: 0,
        totalCount: 0,
        photoCount: 0,
        videoCount: 0,
        docCount: 0,
        audioCount: 0,
        otherCount: 0,
        lastUpdated: Date.now(),
        isScanning: true,
        scannedAllHistory: false,
      });
    }

    try {
      // Use Telegram's native async iterator to traverse the ENTIRE Saved Messages history without truncation
      const iter = client.iterMessages("me", {
        limit: undefined,
      });

      let lastReportTime = Date.now();

      for await (const msg of iter) {
        messagesScanned++;

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

        // Throttle progress updates: report every 50 messages or 250ms
        const now = Date.now();
        if (onProgress && (messagesScanned % 50 === 0 || now - lastReportTime > 250)) {
          lastReportTime = now;
          onProgress(messagesScanned, totalCount, totalBytes, {
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
            lastUpdated: now,
            isScanning: true,
            scannedAllHistory: false,
          });

          // Yield to browser event loop to maintain 60 FPS
          await new Promise(r => setTimeout(r, 0));
        }

        // Safe upper boundary to protect memory on astronomical accounts
        if (messagesScanned >= 100000) {
          break;
        }
      }
    } catch (e) {
      console.warn("Storage metric full scan notice:", e);
      // NOTE: Do not clear accumulated stats! We retain all scanned items.
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
      scannedAllHistory: true,
      discoveredFiles: allParsed,
    };

    // Save final stats to localStorage and IndexedDB
    await cacheService.saveCachedStats(finalStats);

    // Save all discovered files to IndexedDB
    if (allParsed.length > 0) {
      await cacheService.saveCachedFiles(allParsed);
    }

    if (onProgress) {
      onProgress(messagesScanned, totalCount, totalBytes, finalStats);
    }

    return finalStats;
  };

  activeScanPromise = runScan().finally(() => {
    activeScanPromise = null;
  });

  return activeScanPromise;
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
