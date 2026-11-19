import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-explore',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-6xl px-5 py-14">
      <p class="chip bg-paper-200 text-ink-700">Zona pública · sin cuenta</p>
      <h1 class="mt-4 font-display text-5xl">Memoriales que las familias quisieron compartir</h1>
      <p class="mt-3 max-w-2xl text-ink-500">
        Solo aparecen perros con memorial público. El resto del expediente permanece privado.
      </p>
      <div class="mt-10 grid gap-6 md:grid-cols-2">
        @for (item of memorials(); track item.dog.id) {
          <article class="card overflow-hidden">
            <img [src]="item.dog.photos[0]" [alt]="item.dog.name" class="h-64 w-full object-cover" />
            <div class="p-6">
              <h2 class="font-display text-3xl">{{ item.dog.name }}</h2>
              <p class="text-sm text-ink-500">{{ item.dog.breed }} · {{ item.memorial.deathDate }}</p>
              <p class="mt-3">{{ item.memorial.tribute }}</p>
              <a class="btn-ghost mt-4" [routerLink]="['/memorial', item.dog.id]">Abrir memorial</a>
            </div>
          </article>
        } @empty {
          <p>Aún no hay memoriales públicos.</p>
        }
      </div>
    </section>
  `,
})
export class ExplorePage {
  private readonly store = inject(StoreService);
  readonly memorials = signal(
    this.store
      .state()
      .dogs.filter((d) => d.deceased && d.publicMemorial)
      .map((dog) => ({
        dog,
        memorial: this.store.state().memorials.find((m) => m.dogId === dog.id)!,
      })),
  );
}
