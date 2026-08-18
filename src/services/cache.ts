import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'teledrive_cache';
const THUMB_STORE = 'thumbnails';
const DB_VERSION = 1;

class CacheService {
  private db: Promise<IDBPDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.db = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(THUMB_STORE)) {
            db.createObjectStore(THUMB_STORE);
          }
        },
      });
    }
  }

  async getThumbnail(key: string): Promise<string | null> {
    if (!this.db) return null;
    try {
      const blob = await (await this.db).get(THUMB_STORE, key);
      if (blob) {
        // Log to console for user verification
        console.debug(`%c 💾 Local Disk Cache Hit: ${key}`, 'color: #10B981');
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error("Cache Read Error:", e);
    }
    return null;
  }

  async setThumbnail(key: string, buffer: Uint8Array) {
    if (!this.db) return;
    try {
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      await (await this.db).put(THUMB_STORE, blob, key);
      console.debug(`%c ✨ Saved to Local Disk: ${key}`, 'color: #6366F1');
    } catch (e) {
      console.error("Cache Write Error:", e);
    }
  }
}

export const cacheService = new CacheService();