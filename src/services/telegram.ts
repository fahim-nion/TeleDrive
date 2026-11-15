import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { Buffer } from "buffer";
import { TeleUser } from "../types";

(window as any).Buffer = Buffer;

const apiId = Number(import.meta.env.VITE_TELEGRAM_API_ID);
const apiHash = import.meta.env.VITE_TELEGRAM_API_HASH;

class TelegramService {
  public client: TelegramClient | null = null;
  
  private getSavedSession() {
    return new StringSession(localStorage.getItem('td_session') || "");
  }

  async init(): Promise<TelegramClient> {
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
    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash: phoneCodeHash,
          phoneCode: code,
        })
      );
      localStorage.setItem('td_session', client.session.save() as unknown as string);
    } catch (err: any) {
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
        throw new Error("2FA_REQUIRED");
      }
      throw err;
    }
  }

  async signInWith2FA(password: string) {
    const client = await this.init();
    await client.signInWithPassword(
      { apiId, apiHash },
      {
        password: async () => password,
        onError: async (err: any) => {
          console.error("2FA Error:", err);
          return false;
        }
      }
    );
    localStorage.setItem('td_session', client.session.save() as unknown as string);
  }

  async isAuthenticated(): Promise<boolean> {
    const session = localStorage.getItem('td_session');
    if (!session) return false;
    try {
      const client = await this.init();
      return await client.isUserAuthorized();
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('td_session');
    localStorage.removeItem('td_storage_stats_v2');
    if (this.client) {
      try { await this.client.logOut(); } catch (e) {}
    }
    window.location.reload();
  }

  async getMe(): Promise<TeleUser> {
    const client = await this.init();
    const me = await client.getMe() as any;
    let photoUrl = "";
    try {
      const buffer = await client.downloadProfilePhoto(me);
      if (buffer) photoUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' }));
    } catch (e) {}

    const dcId = (client.session as any)?.dcId || 4;

    return { 
      id: me.id ? me.id.toString() : "", 
      firstName: me.firstName || "User", 
      lastName: me.lastName || "",
      username: me.username ? `@${me.username}` : undefined,
      phone: me.phone ? `+${me.phone}` : undefined,
      photoUrl,
      dcId
    };
  }

  getConnectionInfo(): { connected: boolean; dcId: number } {
    const connected = !!this.client?.connected;
    const dcId = (this.client?.session as any)?.dcId || 4;
    return { connected, dcId };
  }
}

export const telegramService = new TelegramService();
