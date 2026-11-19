import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Product } from '../../core/models';

@Component({
  selector: 'app-admin-products',
  imports: [CurrencyPipe, ReactiveFormsModule],
  template: `
    <h1 class="font-display text-4xl">Productos</h1>
    <p class="mt-2 text-ink-500">CRUD exclusivo del administrador: nombre, descripción, precio, stock, imagen y categoría.</p>
    @if (error()) {
      <p class="mt-4 rounded-2xl bg-clay-100 px-4 py-3 text-sm text-clay-700">{{ error() }}</p>
    }
    @if (ok()) {
      <p class="mt-4 rounded-2xl bg-pine-100 px-4 py-3 text-sm text-pine-700">{{ ok() }}</p>
    }
    <form class="card mt-6 grid gap-4 p-6 md:grid-cols-2" [formGroup]="form" (ngSubmit)="save()">
      <label><span class="label">Nombre</span><input class="field" formControlName="name" /></label>
      <label>
        <span class="label">Categoría</span>
        <input class="field" formControlName="category" placeholder="Alimento, Farmacia..." />
      </label>
      <label><span class="label">Precio (COP)</span><input class="field" type="number" min="0" formControlName="price" /></label>
      <label><span class="label">Stock</span><input class="field" type="number" min="0" formControlName="stock" /></label>
      <label class="md:col-span-2"><span class="label">Descripción</span><textarea class="field" rows="3" formControlName="description"></textarea></label>
      <label class="md:col-span-2"><span class="label">URL de imagen</span><input class="field" formControlName="image" /></label>
      <label class="md:col-span-2">
        <span class="label">O subir imagen</span>
        <input class="field" type="file" accept="image/*" (change)="onFile($event)" />
      </label>
      <div class="md:col-span-2 flex gap-2">
        <button class="btn-primary" [disabled]="form.invalid || loading()">{{ editingId() ? 'Guardar cambios' : 'Crear producto' }}</button>
        @if (editingId()) {
          <button class="btn-ghost" type="button" (click)="resetForm()">Cancelar edición</button>
        }
      </div>
    </form>
    <div class="mt-8 grid gap-3">
      @for (p of items(); track p.id) {
        <article class="card flex flex-col gap-4 p-4 sm:flex-row">
          <img [src]="p.image" class="h-24 w-24 rounded-2xl object-cover" [alt]="p.name" />
          <div class="min-w-0 flex-1">
            <p class="font-medium">{{ p.name }}</p>
            <p class="text-sm text-ink-500">{{ p.category }} · {{ p.price | currency: 'COP' : 'symbol-narrow' : '1.0-0' }} · stock {{ p.stock }}</p>
            <p class="text-xs text-ink-300">{{ p.views }} vistas · {{ p.sold }} vendidos</p>
          </div>
          <div class="flex gap-2">
            <button class="btn-ghost" type="button" (click)="edit(p)">Editar</button>
            <button class="btn-accent" type="button" (click)="remove(p)">Eliminar</button>
          </div>
        </article>
      }
    </div>
  `,
})
export class AdminProductsPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  readonly items = signal<Product[]>([]);
  readonly error = signal('');
  readonly ok = signal('');
  readonly loading = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    image: [''],
    category: ['General', Validators.required],
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.products().subscribe({
      next: (rows) => this.items.set(rows),
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo cargar.'),
    });
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.form.patchValue({ image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  edit(product: Product): void {
    this.editingId.set(product.id);
    this.form.setValue({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image: product.image,
      category: product.category,
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '', price: 0, stock: 0, image: '', category: 'General' });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const payload = this.form.getRawValue();
    const id = this.editingId();
    const req = id ? this.api.updateProduct(id, payload) : this.api.createProduct(payload);
    req.subscribe({
      next: () => {
        this.loading.set(false);
        this.ok.set(id ? 'Producto actualizado.' : 'Producto creado.');
        this.resetForm();
        this.reload();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo guardar el producto.');
      },
    });
  }

  remove(product: Product): void {
    if (!confirm(`¿Eliminar ${product.name}?`)) {
      return;
    }
    this.api.deleteProduct(product.id).subscribe({
      next: () => {
        this.ok.set('Producto eliminado.');
        this.reload();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo eliminar.'),
    });
  }
}
