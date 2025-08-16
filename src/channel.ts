import type { SyncMessage, TokenRecord } from './types';

type OnMessage = (msg: SyncMessage) => void;

type BCInstance = {
  postMessage: (msg: any) => void;
  close: () => void;
  onmessage: ((e: { data: any }) => void) | null;
};

export class TokenChannel {
  private bc?: BCInstance;
  private name: string;
  private onMessage?: OnMessage;

  constructor(name: string) {
    this.name = name;

    const g: any = (typeof globalThis !== 'undefined' ? globalThis : undefined) as any;

    if (g && g.BroadcastChannel) {
      this.bc = new g.BroadcastChannel(name) as BCInstance;
      return;
    }

    const hasStorageEvents =
      typeof globalThis !== 'undefined' &&
      !!(globalThis as any).addEventListener &&
      !!(globalThis as any).localStorage;

    if (hasStorageEvents) {
      (globalThis as any).addEventListener('storage', (e: any) => {
        if (e?.key === this.name && e?.newValue) {
          try {
            const msg = JSON.parse(e.newValue) as SyncMessage;
            this.onMessage?.(msg);
          } catch { }
        }
      });
    }
  }

  postMessage(msg: SyncMessage) {
    if (this.bc) {
      this.bc.postMessage(msg);
    } else {
      try {
        localStorage.setItem(this.name, JSON.stringify(msg));
        localStorage.removeItem(this.name);
      } catch { }
    }
  }

  listen(cb: OnMessage) {
    this.onMessage = cb;
    if (this.bc) {
      this.bc.onmessage = (e: any) => cb(e.data as SyncMessage);
    }
    return () => {
      if (this.bc) this.bc.close();
      this.onMessage = undefined;
    };
  }
}
