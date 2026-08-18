import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { Buffer } from "buffer";

(window as any).Buffer = Buffer;

const apiId = Number(import.meta.env.VITE_TELEGRAM_API_ID);
const apiHash = import.meta.env.VITE_TELEGRAM_API_HASH;

class TelegramService {
  public client: TelegramClient | null = null;
  
  // CRITICAL: Initialize session from storage immediately
  private getSavedSession() {
    return new StringSession(localStorage.getItem('td_session') || "");
  }

  async init() {
    if (this.client?.connected) return this.client;

    this.client = new TelegramClient(this.getSavedSession(), apiId, apiHash, {
      connectionRetries: 5,
      autoReconnect: true,
      useWSS: true
    });

    await this.client.connect();
    return this.client;
  }

  async sendCode(phone: string) {
    const client = await this.init();
    return await client.sendCode({ apiId, apiHash }, phone);
  }

  async signIn(phone: string, code: string, phoneCodeHash: string) {
    const client = await this.init();
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash: phoneCodeHash,
        phoneCode: code,
      })
    );
    localStorage.setItem('td_session', client.session.save() as unknown as string);
  }

  async isAuthenticated() {
    const session = localStorage.getItem('td_session');
    if (!session) return false;
    try {
      const client = await this.init();
      return await client.isUserAuthorized();
    } catch {
      return false;
    }
  }

  async logout() {
    localStorage.removeItem('td_session');
    if (this.client) {
      try { await this.client.logOut(); } catch (e) {}
    }
    window.location.reload();
  }

  async getMe() {
    const client = await this.init();
    const me = await client.getMe() as any;
    let photoUrl = "";
    try {
      const buffer = await client.downloadProfilePhoto(me);
      if (buffer) photoUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' }));
    } catch (e) {}
    return { id: me.id.toString(), firstName: me.firstName, photoUrl };
  }
}

export const telegramService = new TelegramService();