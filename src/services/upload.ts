import { telegramService } from "./telegram";
import { CustomFile } from "telegram/client/uploads";
import { Buffer } from "buffer";

export async function uploadToTelegram(fileObj: File, onProgress: (progress: number) => void) {
  const client = telegramService.client;
  if (!client || !client.connected) throw new Error("Telegram not connected");

  const me = await client.getMe();
  const arrayBuffer = await fileObj.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const toUpload = new CustomFile(fileObj.name, fileObj.size, "", buffer);

  try {
    return await client.sendFile(me, {
      file: toUpload,
      caption: `TeleDrive | ${fileObj.name}`,
      forceDocument: true,
      // TURBO SPEED: Saturated parallel workers
      workers: 48, 
      onProgress: (progress: number) => {
        onProgress(Math.round(progress * 100));
      }
    });
  } catch (err: any) {
    console.error("Turbo Upload Error:", err);
    throw err;
  }
}