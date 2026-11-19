import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-dogs',
  imports: [RouterLink],
  template: `
    <div class="flex items-end justify-between">
      <h1 class="font-display text-4xl">{{ title() }}</h1>
      @if (user()?.role === 'owner' || user()?.role === 'admin') {
        <a routerLink="/app/perros/nuevo" class="btn-primary">Nuevo perro</a>
      }
    </div>
    <div class="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      @for (dog of dogs(); track dog.id) {
        <a [routerLink]="['/app/perros', dog.id]" class="card overflow-hidden">
          <img [src]="dog.photos[0]" [alt]="dog.name" class="h-52 w-full object-cover" />
          <div class="p-5">
            <div class="flex items-center justify-between">
              <h2 class="font-display text-2xl">{{ dog.name }}</h2>
              @if (dog.deceased) {
                <span class="chip bg-ink-100">Memorial</span>
              }
            </div>
            <p class="text-sm text-ink-500">{{ dog.breed }} · {{ dog.sex }}</p>
            <p class="mt-2 text-sm">{{ dog.origin }}</p>
          </div>
        </a>
      }
    </div>
  `,
})
export class DogsPage {
  private readonly store = inject(StoreService);
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;
  readonly dogs = computed(() => this.store.state().dogs.filter((d) => this.auth.canAccessDog(d)));
  readonly title = computed(() => (this.user()?.role === 'vet' ? 'Pacientes asignados' : 'Manada'));
}
