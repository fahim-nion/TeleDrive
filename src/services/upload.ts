import { telegramService } from "./telegram";
import { CustomFile } from "telegram/client/uploads";
import { Buffer } from "buffer";
import { Api } from "telegram";
import { cacheService } from "./cache";

export async function renderThumbnailCanvas(blob: Blob, maxDim = 320, quality = 0.75): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) return resolve(null);

        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          async (b) => {
            if (!b) return resolve(null);
            const ab = await b.arrayBuffer();
            resolve(ab);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export async function generateClientThumbnail(file: File): Promise<Buffer | undefined> {
  const isImage = file.type.startsWith('image/') || file.name.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|heic|bmp|avif)$/) !== null;
  if (!isImage) return undefined;

  try {
    let sourceBlob: Blob = file;
    if (file.name.toLowerCase().endsWith('.heic')) {
      const heicModule = await import('heic2any');
      const heic2any = heicModule.default || heicModule;
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.7 });
      sourceBlob = Array.isArray(converted) ? converted[0] : converted;
    }

    const thumbArrayBuffer = await renderThumbnailCanvas(sourceBlob, 320, 0.75);
    if (thumbArrayBuffer) {
      return Buffer.from(thumbArrayBuffer);
    }
  } catch (e) {
    console.warn("Client thumbnail generation skipped:", e);
  }
  return undefined;
}

export async function uploadToTelegram(
  fileObj: File, 
  onProgress: (progress: number) => void
): Promise<Api.Message> {
  const client = await telegramService.init();
  if (!client || !client.connected) throw new Error("Telegram is not connected");

  const me = await client.getMe();
  const arrayBuffer = await fileObj.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const toUpload = new CustomFile(fileObj.name, fileObj.size, "", buffer);

  // Generate client-side thumbnail for images (bypasses Telegram's 9.99MB server thumbnail limit)
  const thumbBuffer = await generateClientThumbnail(fileObj);

  try {
    const sendOptions: any = {
      file: toUpload,
      caption: `TeleDrive | ${fileObj.name}`,
      forceDocument: true,
      workers: 24,
      onProgress: (progress: number) => {
        onProgress(Math.min(100, Math.round(progress * 100)));
      }
    };

    if (thumbBuffer) {
      sendOptions.thumb = thumbBuffer;
    }

    const result = await client.sendFile(me, sendOptions) as Api.Message;

    // Immediately cache the generated thumbnail locally for 0ms load
    if (thumbBuffer && result?.id) {
      const cacheKey = `th_v14:${result.id}`;
      cacheService.setThumbnail(cacheKey, thumbBuffer).catch(() => {});
    }

    return result;
  } catch (err: any) {
    console.error("Upload Error:", err);
    throw err;
  }
}
