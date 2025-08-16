import { useStore } from './store';
import { TokenChannel } from './channel';
import { loadToken, saveToken } from './persist';
import type { BridgeOptions, TokenListener, SyncMessage, TokenRecord } from './types';

const g = globalThis as any;

type Internal = {
  initialized: boolean;
  channel: TokenChannel;
  options: Required<Pick<BridgeOptions, 'channelName' | 'persist' | 'persistKey' | 'persistTTL' | 'isAuthority'>>;
  unlisten?: () => void;
  listeners: Set<TokenListener>;
};

function ensureInternal(opts?: BridgeOptions): Internal {
  if (!g.__mf_token_bridge_internal__) {
    const options = {
      channelName: opts?.channelName ?? 'auth:token',
      persist: opts?.persist ?? false,
      persistKey: opts?.persistKey ?? 'auth:token',
      persistTTL: opts?.persistTTL ?? 60_000,
      isAuthority: opts?.isAuthority ?? false,
    };
    g.__mf_token_bridge_internal__ = {
      initialized: false,
      channel: new TokenChannel(options.channelName),
      options,
      listeners: new Set<TokenListener>(),
    } as Internal;
  } else if (opts) {
    // อนุญาต override บาง field เฉพาะรอบ init แรกๆ
    const i = g.__mf_token_bridge_internal__ as Internal;
    if (!i.initialized) {
      i.options.channelName = opts.channelName ?? i.options.channelName;
      i.options.persist = opts.persist ?? i.options.persist;
      i.options.persistKey = opts.persistKey ?? i.options.persistKey;
      i.options.persistTTL = opts.persistTTL ?? i.options.persistTTL;
      i.options.isAuthority = opts.isAuthority ?? i.options.isAuthority;
    }
  }
  return g.__mf_token_bridge_internal__ as Internal;
}

/** เรียกครั้งเดียวใน host/remote เพื่อเปิดช่อง sync */
export async function initTokenBridge(options?: BridgeOptions) {
  const i = ensureInternal(options);
  if (i.initialized) return;

  // bootstrap จาก IndexedDB (optional)
  if (i.options.persist) {
    const rec = await loadToken(i.options.persistKey, i.options.persistTTL);
    if (rec?.token) {
      useStore.getState().set(rec);
    }
  }

  // listen message
  i.unlisten = i.channel.listen((msg: SyncMessage) => {
    const st = useStore.getState();
    switch (msg.type) {
      case 'token:update':
        st.set(msg.payload);
        void (async () => {
          if (i.options.persist) await saveToken(i.options.persistKey, msg.payload);
        })();
        notifyListeners(msg.payload.token);
        break;
      case 'token:clear':
        st.clear();
        void (async () => {
          if (i.options.persist) await saveToken(i.options.persistKey, null);
        })();
        notifyListeners(null);
        break;
      case 'token:who-has':
        if (i.options.isAuthority) {
          const token = st.token;
          const payload: SyncMessage = {
            type: 'token:here-is',
            payload: token ? { token, expiresAt: st.expiresAt } : null,
          };
          i.channel.postMessage(payload);
        }
        break;
      case 'token:here-is':
        if (msg.payload) {
          st.set(msg.payload);
          notifyListeners(msg.payload.token);
        }
        break;
    }
  });

  // รีเควสต์ซิงค์จาก authority (ถ้ามี)
  i.channel.postMessage({ type: 'token:who-has' });

  i.initialized = true;
}

/** ใช้ใน host เท่านั้น: อัปเดต token (หลัง login/refresh) */
export function setToken(token: string, expiresAt?: number) {
  const i = ensureInternal();
  const rec: TokenRecord = { token, expiresAt };
  useStore.getState().set(rec);
  if (i.options.persist) void saveToken(i.options.persistKey, rec);
  i.channel.postMessage({ type: 'token:update', payload: rec });
}

/** ล้าง token */
export function clearToken() {
  const i = ensureInternal();
  useStore.getState().clear();
  if (i.options.persist) void saveToken(i.options.persistKey, null);
  i.channel.postMessage({ type: 'token:clear' });
}

/** อ่าน token ปัจจุบัน (null ถ้ายังไม่มีหรือหมดอายุ) */
export async function getToken(): Promise<string | null> {
  const { token, isExpired } = useStore.getState();
  if (!token) return null;
  if (isExpired()) return null;
  return token;
}

/** รอ token ให้พร้อม (เช่นตอนรีโหลด) */
export function awaitToken(timeoutMs = 3000): Promise<string | null> {
  return new Promise((resolve) => {
    const immediate = useStore.getState().token;
    if (immediate) return resolve(immediate);

    const t = setTimeout(() => {
      off(); resolve(useStore.getState().token ?? null);
    }, timeoutMs);

    const off = subscribe((tk) => {
      if (tk) {
        clearTimeout(t);
        off();
        resolve(tk);
      }
    });
  });
}

/** subscribe เมื่อ token เปลี่ยน */
export function subscribe(cb: TokenListener): () => void {
  const i = ensureInternal();
  i.listeners.add(cb);
  return () => i.listeners.delete(cb);
}

function notifyListeners(token: string | null) {
  const i = ensureInternal();
  for (const cb of i.listeners) cb(token);
}

/** fetch helper ใส่ Authorization ให้อัตโนมัติ */
export async function authFetch(input: RequestInfo, init?: RequestInit) {
  const token = await getToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export { attachAxios } from './axios';
export type { BridgeOptions, TokenRecord } from './types';
