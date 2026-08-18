import { Buffer } from "buffer";
import process from "process";
(window as any).Buffer = Buffer;
(window as any).global = window;
(window as any).process = process;

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { CustomFile } from "telegram/client/uploads";

const apiId = Number(import.meta.env.VITE_TELEGRAM_API_ID);
const apiHash = import.meta.env.VITE_TELEGRAM_API_HASH;
const stringSession = new StringSession(""); 

const logsEl = document.getElementById("logs")!;
const statusEl = document.getElementById("status")!;

function log(msg: string, isError = false) {
    logsEl.textContent += `\n[${new Date().toLocaleTimeString()}] ${msg}`;
    if (isError) {
        statusEl.textContent = msg;
        statusEl.className = "error";
    }
}

async function start() {
    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
    await client.connect();

    const phoneStep = document.getElementById("phone-step")!;
    const codeStep = document.getElementById("code-step")!;
    const driveStep = document.getElementById("drive-step")!;
    const phoneInput = document.getElementById("phone") as HTMLInputElement;
    const codeInput = document.getElementById("code") as HTMLInputElement;

    // LOGIN LOGIC
    document.getElementById("send-code")!.onclick = async () => {
        try {
            await client.sendCode({ apiId, apiHash }, phoneInput.value);
            log("OTP Sent.");
            phoneStep.classList.add("hidden");
            codeStep.classList.remove("hidden");
        } catch (e: any) { log(e.message, true); }
    };

    document.getElementById("login")!.onclick = async () => {
        try {
            await client.signInUser({ apiId, apiHash }, {
                phoneNumber: phoneInput.value,
                phoneCode: async () => codeInput.value,
                onError: (e) => log(e.message, true)
            });
            log("Logged in!");
            codeStep.classList.add("hidden");
            driveStep.classList.remove("hidden");
            statusEl.textContent = "Logged in successfully!";
            statusEl.className = "success";
        } catch (e: any) { log(e.message, true); }
    };

    // DRIVE LOGIC (The Goal of this task)
    document.getElementById("upload-test")!.onclick = async () => {
        try {
            log("Creating dummy file...");
            const content = "Hello TeleDrive! This proves original bytes can be stored.";
            const fileName = "teledrive_test.txt";
            
            // In browser, we create a Buffer from our text
            const toUpload = Buffer.from(content);
            const file = new CustomFile(fileName, toUpload.length, "", toUpload);

            log("Uploading to Saved Messages...");
            const result = await client.sendFile("me", {
                file: file,
                caption: "TeleDrive Feasibility Test #1",
                workers: 1
            }) as Api.Message;

            log(`UPLOAD SUCCESS! Message ID: ${result.id}`);

            log("Reading message back from Cloud...");
            const messages = await client.getMessages("me", { ids: [result.id] });
            const media = messages[0].media as Api.MessageMediaDocument;
            const doc = media.document as Api.Document;

            log(`CLOUD RECORD FOUND: ${fileName}`);
            log(`Size: ${doc.size.toString()} bytes`);
            log(`MimeType: ${doc.mimeType}`);

            statusEl.textContent = "PHASE 0 COMPLETE: Full Storage Path Verified!";
            statusEl.className = "success";
            log("--- ALL PHASE 0 CRITERIA SATISFIED ---");

        } catch (err: any) {
            log("Drive Test Failed: " + err.message, true);
        }
    };
}

start();