import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Appointment, APPOINTMENT_STATUS_LABEL } from '../../core/models';

type Hydrated = Appointment & {
  clientName?: string;
  vetName?: string;
  dogName?: string;
};

@Component({
  selector: 'app-my-appointments',
  imports: [DatePipe, RouterLink, FormsModule],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl">Citas</h1>
        <p class="mt-2 text-ink-500">{{ subtitle() }}</p>
      </div>
      @if (user()?.role !== 'admin') {
        <a routerLink="/app/citas/agendar" class="btn-primary">Agendar cita</a>
      } @else {
        <a routerLink="/app/citas/agendar" class="btn-primary">Agendar para un cliente</a>
      }
    </div>
    @if (error()) {
      <p class="mt-4 rounded-2xl bg-clay-100 px-4 py-3 text-sm text-clay-700">{{ error() }}</p>
    }
    <div class="mt-6 grid gap-4">
      @for (apt of items(); track apt.id) {
        <article class="card grid gap-4 p-5 md:grid-cols-[1fr_auto]">
          <div>
            <p class="font-display text-2xl">{{ apt.dogName }} · {{ apt.vetName }}</p>
            <p class="text-sm text-ink-500">
              {{ apt.start | date: 'EEEE d MMM y, HH:mm' }} — {{ apt.end | date: 'HH:mm' }}
            </p>
            <p class="mt-2">{{ apt.reason }}</p>
            <p class="mt-1 text-sm text-ink-500">Cliente: {{ apt.clientName }}</p>
            <span
              class="chip mt-3"
              [class]="
                apt.status === 'cancelada'
                  ? 'bg-ink-100 text-ink-700'
                  : apt.status === 'confirmada'
                    ? 'bg-pine-100 text-pine-700'
                    : 'bg-clay-100 text-clay-700'
              "
            >
              {{ labels[apt.status] }}
            </span>
          </div>
          <div class="flex flex-col gap-2">
            @if (apt.status !== 'cancelada') {
              @if (user()?.role !== 'owner') {
                <select class="field" [ngModel]="apt.status" (ngModelChange)="setStatus(apt, $event)">
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
                <label class="text-xs text-ink-500">
                  Reprogramar
                  <input class="field mt-1" type="datetime-local" [ngModel]="toInput(apt.start)" (change)="reschedule(apt, $event)" />
                </label>
              }
              <button class="btn-ghost" type="button" (click)="cancel(apt)">Cancelar</button>
            }
          </div>
        </article>
      } @empty {
        <p class="card p-6 text-ink-500">No hay citas para mostrar.</p>
      }
    </div>
  `,
})
export class MyAppointmentsPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;
  readonly items = signal<Hydrated[]>([]);
  readonly error = signal('');
  readonly labels = APPOINTMENT_STATUS_LABEL;
  readonly subtitle = computed(() => {
    const role = this.user()?.role;
    if (role === 'admin') {
      return 'Todas las citas de la clínica.';
    }
    if (role === 'vet') {
      return 'Tu agenda. Puedes confirmar, reprogramar o cancelar.';
    }
    return 'Solo ves y gestionas tus propias citas.';
  });

  constructor() {
    this.reload();
  }

  toInput(iso: string): string {
    return iso.slice(0, 16);
  }

  reload(): void {
    this.api.appointments().subscribe({
      next: (rows) => this.items.set(rows as Hydrated[]),
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudieron cargar las citas.'),
    });
  }

  cancel(apt: Hydrated): void {
    if (!confirm('¿Cancelar esta cita?')) {
      return;
    }
    this.patch(apt.id, { status: 'cancelada' });
  }

  setStatus(apt: Hydrated, status: string): void {
    this.patch(apt.id, { status: status as Appointment['status'] });
  }

  reschedule(apt: Hydrated, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) {
      return;
    }
    const start = `${value}:00`;
    const endDate = new Date(start);
    endDate.setMinutes(endDate.getMinutes() + 30);
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;
    this.patch(apt.id, { start, end });
  }

  private patch(id: string, payload: Partial<Appointment>): void {
    this.error.set('');
    this.api.patchAppointment(id, payload).subscribe({
      next: () => this.reload(),
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo actualizar la cita.'),
    });
  }
}
