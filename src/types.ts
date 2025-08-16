export type TokenRecord = {
  token: string;
  /** epoch ms */
  expiresAt?: number;
};

export type BridgeOptions = {
  /** ช่องสัญญาณ BroadcastChannel (ต่อ origin) */
  channelName?: string; // default: 'auth:token'
  /** เปิด persist ลง IndexedDB สำหรับ bootstrap หลังรีโหลด */
  persist?: boolean; // default: false
  /** คีย์ที่ใช้ใน IndexedDB */
  persistKey?: string; // default: 'auth:token'
  /** อายุ cache ที่ IndexedDB (ms) */
  persistTTL?: number; // default: 60_000 (1 นาที)
  /** host เท่านั้น: จะตอบ sync request */
  isAuthority?: boolean; // default: false
};

export type TokenListener = (t: string | null) => void;

export type SyncMessage =
  | { type: 'token:update'; payload: TokenRecord }
  | { type: 'token:clear' }
  | { type: 'token:who-has' }
  | { type: 'token:here-is'; payload: TokenRecord | null };
