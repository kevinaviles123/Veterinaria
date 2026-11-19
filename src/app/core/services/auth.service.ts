import { Injectable, computed } from '@angular/core';
import { StoreService } from './store.service';
import { SessionService } from './session.service';
import { CryptoService } from '../security/crypto.service';
import { AuditService } from './audit.service';
import { Dog, Role, User } from '../models';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = computed(() => {
    const id = this.session.userId();
    return this.store.state().users.find((u) => u.id === id) ?? null;
  });

  constructor(
    private readonly store: StoreService,
    private readonly session: SessionService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string): Promise<{ ok: boolean; message: string }> {
    const normalized = email.trim().toLowerCase();
    const user = this.store.state().users.find((u) => u.email.toLowerCase() === normalized);
    if (!user) {
      return { ok: false, message: 'Credenciales inválidas.' };
    }
    if (user.status === 'bloqueado') {
      return { ok: false, message: 'La cuenta está bloqueada. Contacta al administrador.' };
    }
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      return { ok: false, message: 'Demasiados intentos. Espera unos minutos.' };
    }
    const valid = await this.crypto.verify(password, user.passwordSalt, user.passwordHash);
    if (!valid) {
      this.store.patch((s) => {
        const u = s.users.find((x) => x.id === user.id);
        if (!u) {
          return;
        }
        u.failedAttempts += 1;
        if (u.failedAttempts >= MAX_ATTEMPTS) {
          u.lockedUntil = new Date(Date.now() + LOCK_MS).toISOString();
          u.failedAttempts = 0;
        }
      });
      this.audit.log('LOGIN_FAIL', 'user', user.id, `Intento fallido para ${user.email}`);
      return { ok: false, message: 'Credenciales inválidas.' };
    }
    this.store.patch((s) => {
      const u = s.users.find((x) => x.id === user.id);
      if (!u) {
        return;
      }
      u.failedAttempts = 0;
      u.lockedUntil = null;
      u.lastLoginAt = new Date().toISOString();
    });
    this.session.set(user);
    this.audit.log('LOGIN', 'user', user.id, 'Inicio de sesión correcto');
    return { ok: true, message: 'Bienvenido' };
  }

  async register(payload: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
  }): Promise<{ ok: boolean; message: string }> {
    const email = payload.email.trim().toLowerCase();
    if (this.store.state().users.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false, message: 'Ese correo ya está registrado.' };
    }
    if (!this.strongPassword(payload.password)) {
      return {
        ok: false,
        message: 'La clave necesita 10+ caracteres, mayúscula, número y símbolo.',
      };
    }
    const salt = await this.crypto.randomHex(16);
    const hash = await this.crypto.hashPassword(payload.password, salt);
    const user: User = {
      id: this.store.id('usr'),
      email,
      fullName: payload.fullName.trim(),
      role: 'owner',
      phone: payload.phone,
      address: { line1: '', city: '', region: '', country: 'Colombia', postalCode: '' },
      documents: [],
      status: 'activo',
      passwordHash: hash,
      passwordSalt: salt,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.store.patch((s) => s.users.push(user));
    this.session.set(user);
    this.audit.log('REGISTER', 'user', user.id, 'Alta de cliente');
    return { ok: true, message: 'Cuenta creada' };
  }

  async provision(payload: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    role: Role;
    vetClinic?: string;
    licenseNumber?: string;
  }): Promise<{ ok: boolean; message: string; user?: User }> {
    const email = payload.email.trim().toLowerCase();
    if (this.store.state().users.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false, message: 'Ese correo ya está registrado.' };
    }
    if (!this.strongPassword(payload.password)) {
      return {
        ok: false,
        message: 'La clave necesita 10+ caracteres, mayúscula, número y símbolo.',
      };
    }
    const salt = await this.crypto.randomHex(16);
    const hash = await this.crypto.hashPassword(payload.password, salt);
    const user: User = {
      id: this.store.id('usr'),
      email,
      fullName: payload.fullName.trim(),
      role: payload.role,
      phone: payload.phone,
      address: { line1: '', city: '', region: '', country: 'Colombia', postalCode: '' },
      documents: [],
      status: 'activo',
      passwordHash: hash,
      passwordSalt: salt,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      vetClinic: payload.vetClinic,
      licenseNumber: payload.licenseNumber,
    };
    this.store.patch((s) => {
      s.users.push(user);
      if (user.role === 'vet') {
        for (const weekday of [1, 2, 3, 4, 5]) {
          s.availability.push({
            id: this.store.id('av'),
            vetId: user.id,
            weekday,
            startTime: '08:00',
            endTime: '17:00',
            slotMinutes: 30,
          });
        }
      }
    });
    this.audit.log('USER_CREATE', 'user', user.id, `Alta ${payload.role} ${user.email}`);
    return { ok: true, message: 'Usuario creado', user };
  }

  logout(): void {
    const id = this.session.userId() ?? 'unknown';
    this.audit.log('LOGOUT', 'user', id, 'Cierre de sesión');
    this.session.clear();
  }

  can(roles: Role[]): boolean {
    const role = this.session.role();
    return !!role && roles.includes(role);
  }

  canAccessDog(dog: Dog): boolean {
    const user = this.user();
    if (!user) {
      return dog.publicMemorial && dog.deceased;
    }
    if (user.role === 'admin') {
      return true;
    }
    if (user.role === 'owner') {
      return dog.ownerId === user.id;
    }
    if (user.role === 'vet') {
      return dog.assignedVetId === user.id;
    }
    return false;
  }

  canWriteHealth(dog: Dog): boolean {
    const user = this.user();
    if (!user) {
      return false;
    }
    if (user.role === 'admin') {
      return true;
    }
    if (user.role === 'owner') {
      return dog.ownerId === user.id;
    }
    return user.role === 'vet' && dog.assignedVetId === user.id;
  }

  homeByRole(): string {
    const role = this.session.role();
    if (role === 'admin') {
      return '/app/admin';
    }
    if (role === 'vet') {
      return '/app/vet';
    }
    return '/app/inicio';
  }

  strongPassword(value: string): boolean {
    return (
      value.length >= 10 &&
      /[A-ZÁÉÍÓÚÑ]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  }
}
