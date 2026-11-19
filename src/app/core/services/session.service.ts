import { Injectable, computed, signal } from '@angular/core';
import { Role, Session, User } from '../models';

const SESSION_KEY = 'huella.session.v1';
const TTL_MS = 1000 * 60 * 60 * 8;

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly session = signal<Session | null>(this.read());
  readonly current = this.session.asReadonly();
  readonly isAuthenticated = computed(() => {
    const s = this.session();
    return !!s && s.expiresAt > Date.now();
  });

  set(user: User): Session {
    const token = this.random();
    const csrf = this.random();
    const next: Session = {
      token,
      userId: user.id,
      role: user.role,
      issuedAt: Date.now(),
      expiresAt: Date.now() + TTL_MS,
      csrf,
    };
    this.session.set(next);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    return next;
  }

  clear(): void {
    this.session.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  token(): string | null {
    return this.valid()?.token ?? null;
  }

  csrf(): string | null {
    return this.valid()?.csrf ?? null;
  }

  role(): Role | null {
    return this.valid()?.role ?? null;
  }

  userId(): string | null {
    return this.valid()?.userId ?? null;
  }

  valid(): Session | null {
    const s = this.session();
    if (!s || s.expiresAt <= Date.now()) {
      this.clear();
      return null;
    }
    return s;
  }

  private read(): Session | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Session;
      if (parsed.expiresAt <= Date.now()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private random(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
