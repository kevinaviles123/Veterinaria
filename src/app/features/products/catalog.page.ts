import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models';

@Component({
  selector: 'app-catalog',
  imports: [CurrencyPipe, FormsModule],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl">Catálogo</h1>
        <p class="mt-2 text-ink-500">
          {{ user()?.role === 'admin' ? 'Gestiona el inventario desde Productos.' : 'Consulta de productos. Solo lectura.' }}
        </p>
      </div>
      <input class="field max-w-xs" placeholder="Buscar o filtrar categoría" [ngModel]="query()" (ngModelChange)="query.set($event)" />
    </div>
    @if (error()) {
      <p class="mt-4 rounded-2xl bg-clay-100 px-4 py-3 text-sm text-clay-700">{{ error() }}</p>
    }
    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      @for (p of filtered(); track p.id) {
        <article class="card overflow-hidden">
          <img [src]="p.image" [alt]="p.name" class="h-44 w-full object-cover" />
          <div class="p-5">
            <p class="chip bg-paper-100">{{ p.category }}</p>
            <h2 class="mt-2 font-display text-2xl">{{ p.name }}</h2>
            <p class="mt-2 text-sm text-ink-500">{{ p.description }}</p>
            <div class="mt-4 flex items-center justify-between">
              <p class="font-medium">{{ p.price | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</p>
              <p class="text-sm text-ink-500">Stock {{ p.stock }}</p>
            </div>
            <button class="btn-ghost mt-4 w-full" type="button" (click)="view(p)">Ver detalle</button>
          </div>
        </article>
      } @empty {
        <p class="card p-6 text-ink-500 sm:col-span-2">No hay productos para ese filtro.</p>
      }
    </div>
    @if (open()) {
      <div class="fixed inset-0 z-20 grid place-items-center bg-ink-950/40 p-4" (click)="open.set(null)">
        <article class="card max-w-lg p-6" (click)="$event.stopPropagation()">
          <img [src]="open()!.image" class="h-48 w-full rounded-2xl object-cover" [alt]="open()!.name" />
          <h2 class="mt-4 font-display text-3xl">{{ open()!.name }}</h2>
          <p class="mt-2 text-ink-500">{{ open()!.description }}</p>
          <p class="mt-4 font-medium">{{ open()!.price | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</p>
          <p class="text-sm text-ink-500">Visto {{ open()!.views }} veces · {{ open()!.sold }} vendidos</p>
          <button class="btn-primary mt-4" type="button" (click)="open.set(null)">Cerrar</button>
        </article>
      </div>
    }
  `,
})
export class CatalogPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;
  readonly items = signal<Product[]>([]);
  readonly error = signal('');
  readonly open = signal<Product | null>(null);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.items().filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  });

  constructor() {
    this.api.products().subscribe({
      next: (rows) => this.items.set(rows),
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo cargar el catálogo.'),
    });
  }

  view(product: Product): void {
    this.api.product(product.id).subscribe({
      next: (p) => {
        this.open.set(p);
        this.items.update((list) => list.map((x) => (x.id === p.id ? p : x)));
      },
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo abrir el producto.'),
    });
  }
}
