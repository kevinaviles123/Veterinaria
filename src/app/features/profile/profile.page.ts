import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  template: `
    <h1 class="font-display text-4xl">Perfil</h1>
    <p class="mt-2 text-ink-500">Datos personales protegidos. El correo no se cambia desde aquí.</p>
    <form class="card mt-6 grid gap-4 p-6 md:grid-cols-2" [formGroup]="form" (ngSubmit)="save()">
      <label class="md:col-span-2"><span class="label">Nombre</span><input class="field" formControlName="fullName" /></label>
      <label><span class="label">Teléfono</span><input class="field" formControlName="phone" /></label>
      <label><span class="label">Ciudad</span><input class="field" formControlName="city" /></label>
      <label class="md:col-span-2"><span class="label">Dirección</span><input class="field" formControlName="line1" /></label>
      <p class="md:col-span-2 text-sm text-ink-500">Correo: {{ user()?.email }} · Rol: {{ user()?.role }}</p>
      @if (ok()) {
        <p class="md:col-span-2 text-pine-700">Cambios guardados y auditados.</p>
      }
      <button class="btn-primary md:col-span-2">Guardar</button>
    </form>
  `,
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  readonly user = this.auth.user;
  readonly ok = signal(false);
  readonly form = this.fb.nonNullable.group({
    fullName: [this.user()?.fullName ?? '', Validators.required],
    phone: [this.user()?.phone ?? ''],
    city: [this.user()?.address.city ?? ''],
    line1: [this.user()?.address.line1 ?? ''],
  });

  save(): void {
    const v = this.form.getRawValue();
    this.api
      .saveProfile({
        fullName: v.fullName,
        phone: v.phone,
        address: { ...(this.user()?.address ?? { line1: '', city: '', region: '', country: '', postalCode: '' }), city: v.city, line1: v.line1 },
      })
      .subscribe(() => this.ok.set(true));
  }
}
