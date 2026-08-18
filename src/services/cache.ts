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

  /**
   * Retrieves a cached thumbnail as a Blob URL
   * @param key Format: "msgId:size"
   */
  async getThumbnail(key: string): Promise<string | null> {
    if (!this.db) return null;
    try {
      const blob = await (await this.db).get(THUMB_STORE, key);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error("Cache Read Error:", e);
    }
    return null;
  }

  /**
   * Stores a thumbnail Buffer into IndexedDB
   */
  async setThumbnail(key: string, buffer: Buffer | Uint8Array) {
    if (!this.db) return;
    try {
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      await (await this.db).put(THUMB_STORE, blob, key);
    } catch (e) {
      console.error("Cache Write Error:", e);
    }
  }

  /**
   * Clears the entire cache (used for Sync Nodes)
   */
  async clear() {
    if (!this.db) return;
    await (await this.db).clear(THUMB_STORE);
  }
}

export const cacheService = new CacheService();