import { telegramService } from "./telegram";
import { CustomFile } from "telegram/client/uploads";
import { Buffer } from "buffer";

export async function uploadToTelegram(
  fileObj: File, 
  onProgress: (progress: number) => void
) {
  const client = telegramService.client;
  
  if (!client || !client.connected) {
    throw new Error("Telegram not connected");
  }

  // Ensure peer cache is primed
  const me = await client.getMe();

  // Convert File to Buffer specifically for Browser
  const arrayBuffer = await fileObj.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // CustomFile handles the wrapper for MTProto
  const toUpload = new CustomFile(
    fileObj.name, 
    fileObj.size, 
    "", 
    buffer
  );

  try {
    return await client.sendFile(me, {
      file: toUpload,
      caption: `TeleDrive | ${fileObj.name}`,
      forceDocument: true, // Upload as original file
      workers: 1, // Keep at 1 for browser stability
      onProgress: (progress: number) => {
        // GramJS sends 0.0 to 1.0
        onProgress(Math.round(progress * 100));
      }
    });
  } catch (err: any) {
    console.error("Upload error details:", err);
    throw err;
  }
}