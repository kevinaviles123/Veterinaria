import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CryptoService {
  async randomHex(bytes = 16): Promise<string> {
    const buffer = new Uint8Array(bytes);
    crypto.getRandomValues(buffer);
    return this.toHex(buffer);
  }

  async hashPassword(password: string, salt: string): Promise<string> {
    const normalized = `${salt}::${password}::huella-v1`;
    const encoded = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return this.toHex(new Uint8Array(digest));
  }

  async verify(password: string, salt: string, expected: string): Promise<boolean> {
    const actual = await this.hashPassword(password, salt);
    return this.timingSafeEqual(actual, expected);
  }

  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i += 1) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
