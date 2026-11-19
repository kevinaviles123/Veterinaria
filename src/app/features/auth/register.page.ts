import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-xl px-5 py-14">
        <h1 class="font-display text-5xl">Crear cuenta de cliente</h1>
        <p class="mt-3 text-ink-500">Registro público solo para clientes. Veterinarios y administradores los crea el admin.</p>
      <form class="card mt-8 grid gap-4 p-6" [formGroup]="form" (ngSubmit)="submit()">
        <label><span class="label">Nombre</span><input class="field" formControlName="fullName" autocomplete="name" /></label>
        <label><span class="label">Correo</span><input class="field" type="email" formControlName="email" autocomplete="email" /></label>
        <label><span class="label">Teléfono</span><input class="field" formControlName="phone" autocomplete="tel" /></label>
        <label>
          <span class="label">Contraseña</span>
          <input class="field" type="password" formControlName="password" autocomplete="new-password" />
          <span class="mt-1 block text-xs text-ink-500">Mínimo 10 caracteres, mayúscula, número y símbolo.</span>
        </label>
        @if (error()) {
          <p class="rounded-2xl bg-clay-100 px-4 py-3 text-sm text-clay-700">{{ error() }}</p>
        }
        <button class="btn-primary" [disabled]="form.invalid || loading()">Crear cuenta</button>
      </form>
      <p class="mt-4 text-sm"><a class="text-pine-700" routerLink="/ingresar">Ya tengo cuenta</a></p>
    </section>
  `,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(10)]],
  });

  submit(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl('/app/inicio'),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo registrar.');
      },
    });
  }
}
