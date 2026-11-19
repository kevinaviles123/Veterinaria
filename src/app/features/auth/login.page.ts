import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DEMO_CREDENTIALS } from '../../core/data/seed';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-2">
      <div>
        <h1 class="font-display text-5xl">Entrar a Huella</h1>
        <p class="mt-3 text-ink-500">Usa tu cuenta o una credencial de demostración.</p>
        <form class="card mt-8 grid gap-4 p-6" [formGroup]="form" (ngSubmit)="submit()">
          <label>
            <span class="label">Correo</span>
            <input class="field" type="email" autocomplete="username" formControlName="email" />
          </label>
          <label>
            <span class="label">Contraseña</span>
            <input class="field" type="password" autocomplete="current-password" formControlName="password" />
          </label>
          @if (error()) {
            <p class="rounded-2xl bg-clay-100 px-4 py-3 text-sm text-clay-700">{{ error() }}</p>
          }
          <button class="btn-primary" [disabled]="form.invalid || loading()">Ingresar</button>
        </form>
        <p class="mt-4 text-sm">¿Aún no tienes cuenta? <a class="text-pine-700" routerLink="/registro">Crear dueño</a></p>
      </div>
      <aside class="card p-6">
        <p class="label">Credenciales de prueba</p>
        <ul class="mt-4 space-y-4 text-sm">
          @for (c of creds; track c.email) {
            <li class="rounded-2xl bg-paper-100 p-4">
              <p class="font-medium">{{ c.role }}</p>
              <p>{{ c.email }}</p>
              <p class="font-mono">{{ c.password }}</p>
              <button class="btn-ghost mt-3" type="button" (click)="fill(c.email, c.password)">Usar</button>
            </li>
          }
        </ul>
      </aside>
    </section>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly creds = [
    { role: 'Administrador', ...DEMO_CREDENTIALS.admin },
    { role: 'Cliente María', ...DEMO_CREDENTIALS.owner },
    { role: 'Veterinaria Laura', ...DEMO_CREDENTIALS.vet },
    { role: 'Veterinario Andrés', ...DEMO_CREDENTIALS.vet2 },
  ];
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  fill(email: string, password: string): void {
    this.form.setValue({ email, password });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.login(this.form.controls.email.value, this.form.controls.password.value).subscribe({
      next: () => this.router.navigateByUrl(this.auth.homeByRole()),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo entrar.');
      },
    });
  }
}
