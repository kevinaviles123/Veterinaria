import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-dog-new',
  imports: [ReactiveFormsModule],
  template: `
    <h1 class="font-display text-4xl">Registrar un perro</h1>
    <form class="card mt-6 grid gap-4 p-6 md:grid-cols-2" [formGroup]="form" (ngSubmit)="submit()">
      <label class="md:col-span-2"><span class="label">Nombre</span><input class="field" formControlName="name" /></label>
      <label><span class="label">Raza</span><input class="field" formControlName="breed" /></label>
      <label>
        <span class="label">Sexo</span>
        <select class="field" formControlName="sex">
          <option value="hembra">Hembra</option>
          <option value="macho">Macho</option>
        </select>
      </label>
      <label><span class="label">Nacimiento</span><input class="field" type="date" formControlName="birthDate" /></label>
      <label><span class="label">Lugar</span><input class="field" formControlName="birthPlace" /></label>
      <label class="md:col-span-2"><span class="label">Origen / criadero</span><input class="field" formControlName="origin" /></label>
      <label class="md:col-span-2"><span class="label">Foto (URL)</span><input class="field" formControlName="photo" /></label>
      @if (error()) {
        <p class="md:col-span-2 text-clay-700">{{ error() }}</p>
      }
      <button class="btn-primary md:col-span-2" [disabled]="form.invalid">Guardar ficha</button>
    </form>
  `,
})
export class DogNewPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    breed: ['', Validators.required],
    sex: ['hembra', Validators.required],
    birthDate: ['', Validators.required],
    birthPlace: [''],
    origin: [''],
    photo: ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80'],
  });

  submit(): void {
    const v = this.form.getRawValue();
    this.api.createDog({ ...v, sex: v.sex as 'hembra' | 'macho', photos: [v.photo] }).subscribe({
      next: (dog) => this.router.navigate(['/app/perros', dog.id]),
      error: (err) => this.error.set(err?.error?.message ?? 'Error al guardar'),
    });
  }
}
