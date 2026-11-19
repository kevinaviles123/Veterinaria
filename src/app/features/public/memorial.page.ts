import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-public-memorial',
  imports: [RouterLink],
  template: `
    @if (data(); as d) {
      <section class="mx-auto max-w-4xl px-5 py-14">
        <a routerLink="/explorar" class="text-sm text-pine-700">← Memoriales</a>
        <img [src]="d.dog.photos[0]" [alt]="d.dog.name" class="mt-4 h-80 w-full rounded-[2rem] object-cover" />
        <h1 class="mt-6 font-display text-5xl">{{ d.dog.name }}</h1>
        <p class="text-ink-500">{{ d.dog.birthDate }} — {{ d.memorial.deathDate }} · {{ d.dog.breed }}</p>
        <p class="mt-6 text-lg">{{ d.memorial.tribute }}</p>
        <div class="card mt-8 p-6">
          <p class="label">Lugar de descanso</p>
          <p>{{ d.memorial.cemetery }}</p>
          <p class="text-sm text-ink-500">{{ d.memorial.locationRef }}</p>
          @if (d.memorial.lat && d.memorial.lng) {
            <a class="btn-ghost mt-4" [href]="mapUrl()" target="_blank" rel="noopener noreferrer">Ver mapa</a>
          }
        </div>
      </section>
    } @else {
      <p class="p-10">Este memorial no es público o no existe.</p>
    }
  `,
})
export class PublicMemorialPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(StoreService);
  readonly data = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    const dog = this.store.state().dogs.find((d) => d.id === id && d.publicMemorial);
    const memorial = this.store.state().memorials.find((m) => m.dogId === id);
    if (!dog || !memorial) {
      return null;
    }
    return { dog, memorial };
  });
  readonly mapUrl = computed(() => {
    const m = this.data()?.memorial;
    if (!m?.lat || !m.lng) {
      return '#';
    }
    return `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=16/${m.lat}/${m.lng}`;
  });
}
