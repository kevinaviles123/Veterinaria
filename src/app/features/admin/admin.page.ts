import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../core/services/api.service';
import { ROLE_LABEL, User } from '../../core/models';

@Component({
  selector: 'app-admin',
  imports: [ReactiveFormsModule],
  template: `
    <h1 class="font-display text-4xl">Gobierno de la plataforma</h1>
    <p class="mt-2 text-ink-500">Usuarios, catálogos, auditoría y reinicio seguro del entorno demo.</p>
    <div class="mt-6 flex gap-2">
      @for (t of ['usuarios', 'catalogos', 'auditoria']; track t) {
        <button class="chip" [class]="tab() === t ? 'bg-pine-700 text-white' : 'bg-white'" (click)="tab.set(t)">{{ t }}</button>
      }
    </div>
    @if (tab() === 'usuarios') {
      <form class="card mt-6 grid gap-3 p-6 md:grid-cols-2" [formGroup]="userForm" (ngSubmit)="createUser()">
        <p class="md:col-span-2 font-display text-2xl">Alta de veterinario o cliente</p>
        <label><span class="label">Nombre</span><input class="field" formControlName="fullName" /></label>
        <label><span class="label">Correo</span><input class="field" type="email" formControlName="email" /></label>
        <label><span class="label">Teléfono</span><input class="field" formControlName="phone" /></label>
        <label>
          <span class="label">Rol</span>
          <select class="field" formControlName="role">
            <option value="vet">Veterinario</option>
            <option value="owner">Cliente</option>
          </select>
        </label>
        <label><span class="label">Contraseña temporal</span><input class="field" type="password" formControlName="password" /></label>
        <label><span class="label">Clínica / matrícula (vet)</span><input class="field" formControlName="vetClinic" /></label>
        @if (userError()) {
          <p class="md:col-span-2 rounded-2xl bg-clay-100 px-4 py-3 text-sm text-clay-700">{{ userError() }}</p>
        }
        <button class="btn-primary md:col-span-2" [disabled]="userForm.invalid">Crear usuario</button>
      </form>
      <div class="card mt-6 overflow-x-auto p-4">
        <table class="w-full text-left text-sm">
          <thead><tr class="text-ink-500"><th class="p-2">Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr class="border-t border-ink-100">
                <td class="p-2">{{ u.fullName }}<br /><span class="text-ink-300">{{ u.email }}</span></td>
                <td>{{ labels[u.role] }}</td>
                <td>{{ u.status }}</td>
                <td class="p-2">
                  @if (u.role !== 'admin') {
                    <button class="btn-ghost" type="button" (click)="toggle(u)">
                      {{ u.status === 'bloqueado' ? 'Activar' : 'Bloquear' }}
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    @if (tab() === 'catalogos') {
      <div class="card mt-6 p-6">
        <div class="flex gap-2">
          <input class="field" #name placeholder="Nombre" />
          <select class="field" #type>
            <option value="raza">Raza</option>
            <option value="vacuna">Vacuna</option>
            <option value="alimento">Alimento</option>
            <option value="aseguradora">Aseguradora</option>
          </select>
          <button class="btn-primary" type="button" (click)="addCat(type.value, name.value); name.value = ''">Añadir</button>
        </div>
        <ul class="mt-4 grid gap-2 md:grid-cols-2">
          @for (c of catalogs(); track c.id) {
            <li class="rounded-2xl bg-paper-100 px-4 py-3 text-sm">{{ c.type }} · {{ c.name }}</li>
          }
        </ul>
      </div>
    }
    @if (tab() === 'auditoria') {
      <div class="mt-6 grid gap-2">
        @for (a of audit(); track a.id) {
          <article class="card p-4 text-sm">
            <p class="font-medium">{{ a.action }} · {{ a.entity }}</p>
            <p class="text-ink-500">{{ a.at }} · {{ a.actorName }} · {{ a.details }}</p>
          </article>
        }
      </div>
    }
    <button class="btn-accent mt-8" type="button" (click)="reset()">Restablecer datos demo</button>
  `,
})
export class AdminPage {
  private readonly store = inject(StoreService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly labels = ROLE_LABEL;
  readonly userError = signal('');
  readonly userForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    role: ['vet' as 'vet' | 'owner', Validators.required],
    password: ['', [Validators.required, Validators.minLength(10)]],
    vetClinic: [''],
  });
  readonly tab = signal(
    this.router.url.includes('catalogos') ? 'catalogos' : this.router.url.includes('auditoria') ? 'auditoria' : 'usuarios',
  );
  readonly users = computed(() => this.store.state().users);
  readonly catalogs = computed(() => this.store.state().catalogs);
  readonly audit = computed(() => this.store.state().audit);

  createUser(): void {
    if (this.userForm.invalid) {
      return;
    }
    this.userError.set('');
    const v = this.userForm.getRawValue();
    this.api.createUser({ ...v, licenseNumber: v.role === 'vet' ? 'MVZ-nuevo' : undefined }).subscribe({
      next: () => this.userForm.reset({ fullName: '', email: '', phone: '', role: 'vet', password: '', vetClinic: '' }),
      error: (err) => this.userError.set(err?.error?.message ?? 'No se pudo crear el usuario.'),
    });
  }

  toggle(user: User): void {
    const status = user.status === 'bloqueado' ? 'activo' : 'bloqueado';
    this.api.patchUser(user.id, { status }).subscribe();
  }

  addCat(type: string, name: string): void {
    if (!name.trim()) {
      return;
    }
    this.api.addCatalog({ type: type as 'raza', name: name.trim() }).subscribe();
  }

  reset(): void {
    if (!confirm('Esto borra cambios locales y recarga el semillero demo.')) {
      return;
    }
    this.store.resetDemo();
    location.reload();
  }
}
