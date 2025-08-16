import { get, set, del } from 'idb-keyval';
import type { TokenRecord } from './types';

const now = () => Date.now();

export async function loadToken(
  key: string,
  ttlMs: number
): Promise<TokenRecord | null> {
  try {
    const data = (await get(key)) as { rec: TokenRecord; savedAt: number } | undefined;
    if (!data) return null;
    if (now() - data.savedAt > ttlMs) {
      await del(key);
      return null;
    }
    return data.rec;
  } catch {
    return null;
  }
}

export async function saveToken(key: string, rec: TokenRecord | null) {
  try {
    if (!rec) {
      await del(key);
    } else {
      await set(key, { rec, savedAt: now() });
    }
  } catch {}
}
