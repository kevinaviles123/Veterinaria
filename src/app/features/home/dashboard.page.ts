import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-ink-500">Hoy en la jauría</p>
        <h1 class="font-display text-4xl">Hola, {{ user()?.fullName }}</h1>
      </div>
      @if (user()?.role === 'owner') {
        <div class="flex flex-wrap gap-2">
          <a routerLink="/app/citas" class="btn-ghost">Mis citas</a>
          <a routerLink="/app/perros/nuevo" class="btn-primary">Registrar perro</a>
        </div>
      }
    </div>
    <section class="mt-8 grid gap-4 md:grid-cols-3">
      <article class="card p-5"><p class="text-ink-500">Perros a cargo</p><p class="font-display text-4xl">{{ dogs().length }}</p></article>
      <article class="card p-5"><p class="text-ink-500">Vacunas pendientes</p><p class="font-display text-4xl">{{ pending().length }}</p></article>
      <article class="card p-5"><p class="text-ink-500">Momentos guardados</p><p class="font-display text-4xl">{{ moments() }}</p></article>
    </section>
    <section class="mt-8 grid gap-6 lg:grid-cols-2">
      <div class="card p-6">
        <h2 class="font-display text-2xl">Tus perros</h2>
        <div class="mt-4 grid gap-3">
          @for (dog of dogs(); track dog.id) {
            <a [routerLink]="['/app/perros', dog.id]" class="flex gap-4 rounded-2xl bg-paper-100 p-3">
              <img [src]="dog.photos[0]" class="h-16 w-16 rounded-2xl object-cover" [alt]="dog.name" />
              <div>
                <p class="font-medium">{{ dog.name }}</p>
                <p class="text-sm text-ink-500">{{ dog.breed }} · {{ dog.birthDate | date }}</p>
              </div>
            </a>
          }
        </div>
      </div>
      <div class="card p-6">
        <h2 class="font-display text-2xl">Alertas sanitarias</h2>
        <ul class="mt-4 space-y-3">
          @for (v of pending(); track v.id) {
            <li class="flex items-center justify-between rounded-2xl bg-paper-100 px-4 py-3">
              <span>{{ v.dogName }} · {{ v.type }}</span>
              <span class="chip" [class]="v.status === 'vencida' ? 'bg-clay-100 text-clay-700' : 'bg-pine-100 text-pine-700'">
                {{ v.status }}
              </span>
            </li>
          } @empty {
            <p class="text-ink-500">Sin vacunas pendientes.</p>
          }
        </ul>
      </div>
    </section>
  `,
})
export class DashboardPage {
  private readonly store = inject(StoreService);
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;
  readonly dogs = computed(() => this.store.state().dogs.filter((d) => this.auth.canAccessDog(d)));
  readonly pending = computed(() => {
    const ids = this.dogs().map((d) => d.id);
    return this.store
      .state()
      .vaccines.filter((v) => ids.includes(v.dogId) && v.status !== 'aplicada')
      .map((v) => ({ ...v, dogName: this.store.state().dogs.find((d) => d.id === v.dogId)?.name }));
  });
  readonly moments = computed(() => {
    const ids = this.dogs().map((d) => d.id);
    return this.store.state().moments.filter((m) => ids.includes(m.dogId)).length;
  });
}
