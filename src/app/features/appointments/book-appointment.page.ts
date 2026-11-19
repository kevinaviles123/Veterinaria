import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { StoreService } from '../../core/services/store.service';
import { Slot, User } from '../../core/models';
import { datePart } from '../../core/clinic/slots';

@Component({
  selector: 'app-book-appointment',
  imports: [FullCalendarModule, ReactiveFormsModule, RouterLink, DatePipe],
  template: `
    <a routerLink="/app/citas" class="text-sm text-pine-700">← Volver a citas</a>
    <h1 class="mt-2 font-display text-4xl">Agendar cita</h1>
    <p class="mt-2 text-ink-500">Los bloques en rojo ya están ocupados. Elige un horario libre.</p>

    <div class="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside class="card p-4">
        <p class="label">Veterinario</p>
        <ul class="mt-2 grid gap-2">
          @for (vet of vets(); track vet.id) {
            <li>
              <button
                class="w-full rounded-2xl px-4 py-3 text-left text-sm"
                [class]="vetId() === vet.id ? 'bg-pine-700 text-white' : 'bg-paper-100'"
                type="button"
                (click)="selectVet(vet.id)"
              >
                <span class="block font-medium">{{ vet.fullName }}</span>
                <span class="block text-xs opacity-80">{{ vet.vetClinic }}</span>
              </button>
            </li>
          }
        </ul>
      </aside>
      <div class="card overflow-hidden p-3">
        <full-calendar [options]="calendarOptions()" />
      </div>
    </div>

    @if (selected()) {
      <form class="card mt-6 grid gap-4 p-6 md:grid-cols-2" [formGroup]="form" (ngSubmit)="submit()">
        <p class="md:col-span-2 font-display text-2xl">
          Reservar {{ selected()!.start | date: 'EEEE d MMM, HH:mm' }}
        </p>
        @if (user()?.role !== 'owner') {
          <label>
            <span class="label">Cliente</span>
            <select class="field" formControlName="clientId">
              <option value="">Selecciona</option>
              @for (c of clients(); track c.id) {
                <option [value]="c.id">{{ c.fullName }}</option>
              }
            </select>
          </label>
        }
        <label>
          <span class="label">Mascota</span>
          <select class="field" formControlName="dogId">
            <option value="">Selecciona</option>
            @for (d of dogs(); track d.id) {
              <option [value]="d.id">{{ d.name }} · {{ d.breed }}</option>
            }
          </select>
        </label>
        <label class="md:col-span-2">
          <span class="label">Motivo</span>
          <input class="field" formControlName="reason" placeholder="Vacuna, control, malestar..." />
        </label>
        @if (error()) {
          <p class="md:col-span-2 rounded-2xl bg-clay-100 px-4 py-3 text-sm text-clay-700">{{ error() }}</p>
        }
        <button class="btn-primary md:col-span-2" [disabled]="form.invalid || loading()">Confirmar cita</button>
      </form>
    }
  `,
})
export class BookAppointmentPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(StoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly user = this.auth.user;
  readonly vets = signal<User[]>([]);
  readonly vetId = signal('');
  readonly slots = signal<Slot[]>([]);
  readonly selected = signal<Slot | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly form = this.fb.nonNullable.group({
    clientId: [''],
    dogId: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(4)]],
  });

  readonly clients = computed(() => this.store.state().users.filter((u) => u.role === 'owner' && u.status === 'activo'));
  readonly dogs = computed(() => {
    const role = this.user()?.role;
    const clientId = role === 'owner' ? this.user()?.id : this.form.controls.clientId.value;
    return this.store.state().dogs.filter((d) => !d.deceased && (!clientId || d.ownerId === clientId));
  });

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    locale: esLocale,
    slotMinTime: '07:00:00',
    slotMaxTime: '19:00:00',
    allDaySlot: false,
    height: 'auto',
    events: this.events(),
    eventClick: (info) => this.onEvent(info),
  }));

  constructor() {
    this.api.vets().subscribe((vets) => {
      this.vets.set(vets);
      const preset = this.route.snapshot.paramMap.get('vetId') ?? vets[0]?.id ?? '';
      if (preset) {
        this.selectVet(preset);
      }
    });
    this.form.controls.clientId.valueChanges.subscribe(() => this.form.controls.dogId.setValue(''));
  }

  selectVet(id: string): void {
    this.vetId.set(id);
    this.selected.set(null);
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + 21);
    this.api.slots(id, this.isoDate(from), this.isoDate(to)).subscribe({
      next: (slots) => this.slots.set(slots),
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo cargar la agenda.'),
    });
  }

  events(): EventInput[] {
    return this.slots().map((slot) => ({
      title: slot.available ? 'Disponible' : 'Ocupado',
      start: slot.start,
      end: slot.end,
      display: slot.available ? 'auto' : 'background',
      backgroundColor: slot.available ? '#2F6B54' : '#E29A6A',
      borderColor: slot.available ? '#1F4A3C' : '#C45C26',
      extendedProps: { slot },
      editable: false,
    }));
  }

  onEvent(info: EventClickArg): void {
    const slot = info.event.extendedProps['slot'] as Slot;
    if (!slot.available) {
      this.error.set('Ese horario ya está ocupado.');
      return;
    }
    this.error.set('');
    this.selected.set(slot);
  }

  submit(): void {
    if (this.form.invalid || !this.selected() || !this.vetId()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    this.api
      .createAppointment({
        vetId: this.vetId(),
        dogId: v.dogId,
        clientId: this.user()?.role === 'owner' ? this.user()!.id : v.clientId,
        start: this.selected()!.start,
        end: this.selected()!.end,
        reason: v.reason,
      })
      .subscribe({
        next: () => this.router.navigateByUrl('/app/citas'),
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'No se pudo agendar.');
        },
      });
  }

  private isoDate(d: Date): string {
    return datePart(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00`,
    );
  }
}
