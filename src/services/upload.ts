import { telegramService } from "./telegram";
import { CustomFile } from "telegram/client/uploads";
import { Buffer } from "buffer";
import { Api } from "telegram";

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

  try {
    const result = await client.sendFile(me, {
      file: toUpload,
      caption: `TeleDrive | ${fileObj.name}`,
      forceDocument: true,
      workers: 24,
      onProgress: (progress: number) => {
        onProgress(Math.min(100, Math.round(progress * 100)));
      }
    });
    return result as Api.Message;
  } catch (err: any) {
    console.error("Upload Error:", err);
    throw err;
  }
}
