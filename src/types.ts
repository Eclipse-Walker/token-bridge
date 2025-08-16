export type TokenRecord = {
  token: string;
  expiresAt?: number;
};

export type BridgeOptions = {
  channelName?: string; // default: 'auth:token'
  persist?: boolean; // default: false
  persistKey?: string; // default: 'auth:token'
  persistTTL?: number; // default: 60_000 (1 นาที)
  isAuthority?: boolean; // default: false
};

export type TokenListener = (t: string | null) => void;

export type SyncMessage =
  | { type: 'token:update'; payload: TokenRecord }
  | { type: 'token:clear' }
  | { type: 'token:who-has' }
  | { type: 'token:here-is'; payload: TokenRecord | null };
