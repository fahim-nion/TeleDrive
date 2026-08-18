import { Api } from "telegram";
import { telegramService } from "./telegram";
import { CloudFile } from "../types";

let activeRequests = 0;
const MAX_CONCURRENT = 3;
const queue: (() => void)[] = [];

const processQueue = () => {
  if (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const next = queue.shift();
    if (next) { activeRequests++; next(); }
  }
};

export async function getThumbnail(message: Api.Message): Promise<string | null> {
  return new Promise((resolve) => {
    const startRequest = async () => {
      const client = telegramService.client;
      if (!client) { resolve(null); return; }
      try {
        const buffer = await client.downloadMedia(message, { thumbClass: Api.PhotoSize });
        resolve(buffer ? URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })) : null);
      } catch { resolve(null); }
      finally { activeRequests--; processQueue(); }
    };
    queue.push(startRequest);
    processQueue();
  });
}

export async function fetchCloudFiles(): Promise<CloudFile[]> {
  const client = await telegramService.init();
  // Simple fetch of last 100 items - stable
  const messages = await client.getMessages("me", { limit: 100 });
  
  return messages
    .filter(msg => msg.media instanceof Api.MessageMediaDocument)
    .map(msg => {
      const doc = msg.media.document as Api.Document;
      const fileAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
      const videoAttr = doc.attributes.find(a => a instanceof Api.DocumentAttributeVideo) as Api.DocumentAttributeVideo;
      const isVideo = doc.mimeType.startsWith('video/') || !!videoAttr;

      return {
        messageId: msg.id,
        name: fileAttr?.fileName || "Unknown",
        size: Number(doc.size),
        date: msg.date,
        mimeType: doc.mimeType,
        downloadStatus: 'IDLE',
        downloadProgress: 0,
        thumbnail: (doc.thumbs && doc.thumbs.length > 0) ? msg : undefined,
        isVideo: isVideo,
        duration: videoAttr?.duration || 0,
        selected: false
      };
    })
    .sort((a, b) => b.date - a.date);
}

export async function downloadFileFromTelegram(messageId: number, onProgress: (p: number) => void) {
  const client = await telegramService.init();
  const messages = await client.getMessages("me", { ids: [messageId] });
  return await client.downloadMedia(messages[0], {
    progressCallback: (t, d) => onProgress(Math.round((Number(d)/Number(t)) * 100))
  });
}

export async function deleteFileFromTelegram(messageId: number) {
  const client = await telegramService.init();
  await client.deleteMessages("me", [messageId], { revoke: true });
}