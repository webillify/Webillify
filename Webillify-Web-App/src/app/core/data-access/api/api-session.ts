import { Injectable, signal } from '@angular/core';
import { AuthSession } from '../../domain/auth.models';

const LOCAL_KEY = 'webillify.api.session.local';
const SESSION_KEY = 'webillify.api.session.tab';

export interface StoredApiSession {
  readonly accessToken: string;
  readonly accessExpiresAt: string;
  readonly remember: boolean;
  readonly session: AuthSession;
}

@Injectable({ providedIn: 'root' })
export class ApiSessionStore {
  private readonly stored = signal<StoredApiSession | null>(this.read());

  get snapshot(): StoredApiSession | null {
    return this.stored();
  }

  get accessToken(): string | null {
    return this.stored()?.accessToken ?? null;
  }

  get organizationId(): string | null {
    return this.stored()?.session.workspace?.organizationId ?? null;
  }

  save(value: StoredApiSession): void {
    this.clearStorage();
    this.storage(value.remember)?.setItem(
      value.remember ? LOCAL_KEY : SESSION_KEY,
      JSON.stringify(value),
    );
    this.stored.set(value);
  }

  clear(): void {
    this.clearStorage();
    this.stored.set(null);
  }

  private read(): StoredApiSession | null {
    for (const [storage, key] of [
      [this.localStorage, LOCAL_KEY],
      [this.sessionStorage, SESSION_KEY],
    ] as const) {
      const raw = storage?.getItem(key);
      if (!raw) continue;
      try {
        return JSON.parse(raw) as StoredApiSession;
      } catch {
        storage?.removeItem(key);
      }
    }
    return null;
  }

  private clearStorage(): void {
    this.localStorage?.removeItem(LOCAL_KEY);
    this.sessionStorage?.removeItem(SESSION_KEY);
  }

  private storage(remember: boolean): Storage | null {
    return remember ? this.localStorage : this.sessionStorage;
  }

  private get localStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }

  private get sessionStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  }
}
