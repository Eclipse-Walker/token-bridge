import type { SyncMessage, TokenRecord } from './types';

type OnMessage = (msg: SyncMessage) => void;

export class TokenChannel {
  private bc?: BroadcastChannel;
  private name: string;
  private onMessage?: OnMessage;

  constructor(name: string) {
    this.name = name;
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel(name);
    } else {
      // Fallback ผ่าน storage event (last resort)
      window.addEventListener('storage', (e) => {
        if (e.key === this.name && e.newValue) {
          try {
            const msg = JSON.parse(e.newValue) as SyncMessage;
            this.onMessage?.(msg);
          } catch {}
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
        // trigger storage event
        localStorage.removeItem(this.name);
      } catch {}
    }
  }

  listen(cb: OnMessage) {
    this.onMessage = cb;
    if (this.bc) {
      this.bc.onmessage = (e) => cb(e.data as SyncMessage);
    }
    return () => {
      if (this.bc) this.bc.close();
      this.onMessage = undefined;
    };
  }
}
