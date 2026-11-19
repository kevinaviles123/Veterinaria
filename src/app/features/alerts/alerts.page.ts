import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-alerts',
  imports: [RouterLink],
  template: `
    <h1 class="font-display text-4xl">Vacunas y recordatorios</h1>
    <div class="mt-6 grid gap-3">
      @for (v of alerts(); track v.id) {
        <a [routerLink]="['/app/perros', v.dogId]" class="card flex items-center justify-between p-5">
          <div>
            <p class="font-medium">{{ v.dogName }} · {{ v.type }}</p>
            <p class="text-sm text-ink-500">Programada {{ v.scheduledDate }} · {{ v.veterinarian }}</p>
          </div>
          <span class="chip" [class]="v.status === 'vencida' ? 'bg-clay-100 text-clay-700' : 'bg-pine-100 text-pine-700'">
            {{ v.status }}
          </span>
        </a>
      }
    </div>
  `,
})
export class AlertsPage {
  private readonly store = inject(StoreService);
  private readonly auth = inject(AuthService);
  readonly alerts = computed(() => {
    const dogs = this.store.state().dogs.filter((d) => this.auth.canAccessDog(d));
    const ids = dogs.map((d) => d.id);
    return this.store
      .state()
      .vaccines.filter((v) => ids.includes(v.dogId) && v.status !== 'aplicada')
      .map((v) => ({ ...v, dogName: dogs.find((d) => d.id === v.dogId)?.name }));
  });
}
