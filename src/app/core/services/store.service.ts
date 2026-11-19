import { Injectable, signal } from '@angular/core';
import { AppState } from '../models';
import { DEMO_CREDENTIALS, INITIAL_STATE } from '../data/seed';
import { CryptoService } from '../security/crypto.service';

const KEY = 'huella.store.v2';

@Injectable({ providedIn: 'root' })
export class StoreService {
  readonly ready = signal(false);
  readonly state = signal<AppState>(structuredClone(INITIAL_STATE));

  constructor(private readonly crypto: CryptoService) {}

  async init(): Promise<void> {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        this.state.set(this.hydrate(JSON.parse(raw) as AppState));
      } catch {
        this.state.set(structuredClone(INITIAL_STATE));
      }
    }
    await this.ensurePasswordHashes();
    this.persist();
    this.ready.set(true);
  }

  persist(): void {
    localStorage.setItem(KEY, JSON.stringify(this.state()));
  }

  resetDemo(): void {
    localStorage.removeItem(KEY);
    this.state.set(structuredClone(INITIAL_STATE));
    this.ready.set(false);
  }

  patch(mutator: (draft: AppState) => void): AppState {
    const next = structuredClone(this.state());
    mutator(next);
    this.state.set(next);
    this.persist();
    return next;
  }

  id(prefix: string): string {
    return `${prefix}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}`;
  }

  private hydrate(raw: AppState): AppState {
    const seed = structuredClone(INITIAL_STATE);
    return {
      ...seed,
      ...raw,
      availability: raw.availability ?? seed.availability,
      appointments: raw.appointments ?? seed.appointments,
      products: raw.products ?? seed.products,
    };
  }

  private async ensurePasswordHashes(): Promise<void> {
    const users = this.state().users;
    let changed = false;
    for (const user of users) {
      if (user.passwordHash && user.passwordSalt) {
        continue;
      }
      const demo =
        Object.values(DEMO_CREDENTIALS).find((c) => c.email === user.email)?.password ??
        'Cambio#2026!';
      user.passwordSalt = await this.crypto.randomHex(16);
      user.passwordHash = await this.crypto.hashPassword(demo, user.passwordSalt);
      changed = true;
    }
    if (changed) {
      this.state.update((s) => ({ ...s, users: [...users] }));
    }
  }
}
