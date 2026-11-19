import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Appointment, APPOINTMENT_STATUS_LABEL, VetAvailability } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';

const WEEKDAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

type Hydrated = Appointment & {
  clientName?: string;
  dogName?: string;
  dogBreed?: string;
  clientEmail?: string;
};

@Component({
  selector: 'app-vet',
  imports: [FullCalendarModule, ReactiveFormsModule, RouterLink, DatePipe],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl">Agenda clínica</h1>
        <p class="mt-2 text-ink-500">{{ user()?.fullName }} · {{ user()?.vetClinic }}</p>
      </div>
      <a routerLink="/app/citas/agendar" class="btn-primary">Agendar / reprogramar</a>
    </div>

    @if (error()) {
      <p class="mt-4 rounded-2xl bg-clay-100 px-4 py-3 text-sm text-clay-700">{{ error() }}</p>
    }
    @if (ok()) {
      <p class="mt-4 rounded-2xl bg-pine-100 px-4 py-3 text-sm text-pine-700">{{ ok() }}</p>
    }

    <section class="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div class="card overflow-hidden p-3">
        <full-calendar [options]="calendarOptions()" />
      </div>
      <div class="grid gap-6">
        @if (detail()) {
          <article class="card p-5">
            <h2 class="font-display text-2xl">Detalle de la cita</h2>
            <p class="mt-2 text-sm text-ink-500">{{ detail()!.start | date: 'EEEE d MMM y, HH:mm' }}</p>
            <ul class="mt-4 space-y-2 text-sm">
              <li><strong>Cliente:</strong> {{ detail()!.clientName }} · {{ detail()!.clientEmail }}</li>
              <li><strong>Mascota:</strong> {{ detail()!.dogName }} ({{ detail()!.dogBreed }})</li>
              <li><strong>Motivo:</strong> {{ detail()!.reason }}</li>
              <li><strong>Estado:</strong> {{ labels[detail()!.status] }}</li>
            </ul>
            @if (detail()!.status !== 'cancelada') {
              <div class="mt-4 flex flex-wrap gap-2">
                <button class="btn-primary" type="button" (click)="setStatus('confirmada')">Confirmar</button>
                <button class="btn-ghost" type="button" (click)="setStatus('cancelada')">Cancelar</button>
              </div>
            }
          </article>
        }
        <article class="card p-5">
          <h2 class="font-display text-2xl">Disponibilidad</h2>
          <p class="mt-1 text-sm text-ink-500">Define los días y horas en que te pueden agendar.</p>
          <form class="mt-4 grid gap-3" [formGroup]="slotForm" (ngSubmit)="addRule()">
            <select class="field" formControlName="weekday">
              @for (d of weekdays; track d.value) {
                <option [ngValue]="d.value">{{ d.label }}</option>
              }
            </select>
            <div class="grid grid-cols-2 gap-2">
              <input class="field" type="time" formControlName="startTime" />
              <input class="field" type="time" formControlName="endTime" />
            </div>
            <button class="btn-primary" type="submit" [disabled]="slotForm.invalid">Añadir bloque</button>
          </form>
          <ul class="mt-4 space-y-2">
            @for (rule of rules(); track rule.id) {
              <li class="flex items-center justify-between rounded-2xl bg-paper-100 px-3 py-2 text-sm">
                <span>{{ weekdayLabel(rule.weekday) }} · {{ rule.startTime }}–{{ rule.endTime }}</span>
                <button class="btn-ghost" type="button" (click)="removeRule(rule.id)">Quitar</button>
              </li>
            }
          </ul>
        </article>
      </div>
    </section>

    <section class="mt-8">
      <h2 class="font-display text-2xl">Pacientes asignados</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        @for (dog of patients(); track dog.id) {
          <a [routerLink]="['/app/perros', dog.id]" class="card flex gap-4 p-4">
            <img [src]="dog.photos[0]" class="h-20 w-20 rounded-2xl object-cover" [alt]="dog.name" />
            <div>
              <p class="font-display text-2xl">{{ dog.name }}</p>
              <p class="text-sm text-ink-500">{{ dog.breed }}</p>
            </div>
          </a>
        }
      </div>
    </section>
  `,
})
export class VetPage {
  private readonly store = inject(StoreService);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly user = this.auth.user;
  readonly labels = APPOINTMENT_STATUS_LABEL;
  readonly weekdays = WEEKDAYS;
  readonly error = signal('');
  readonly ok = signal('');
  readonly rules = signal<VetAvailability[]>([]);
  readonly appointments = signal<Hydrated[]>([]);
  readonly detail = signal<Hydrated | null>(null);
  readonly slotForm = this.fb.nonNullable.group({
    weekday: [1, Validators.required],
    startTime: ['08:00', Validators.required],
    endTime: ['17:00', Validators.required],
  });

  readonly patients = computed(() => this.store.state().dogs.filter((d) => d.assignedVetId === this.user()?.id));

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay,dayGridMonth' },
    locale: esLocale,
    slotMinTime: '07:00:00',
    slotMaxTime: '19:00:00',
    allDaySlot: false,
    height: 'auto',
    events: this.events(),
    eventClick: (info) => this.onEvent(info),
    businessHours: this.rules().map((r) => ({
      daysOfWeek: [r.weekday],
      startTime: r.startTime,
      endTime: r.endTime,
    })),
  }));

  constructor() {
    const id = this.user()?.id;
    if (id) {
      this.api.availability(id).subscribe((rows) => this.rules.set(rows));
    }
    this.api.appointments().subscribe((rows) => this.appointments.set(rows as Hydrated[]));
  }

  weekdayLabel(day: number): string {
    return WEEKDAYS.find((d) => d.value === day)?.label ?? '';
  }

  events(): EventInput[] {
    return this.appointments()
      .filter((a) => a.status !== 'cancelada')
      .map((a) => ({
        id: a.id,
        title: `${a.dogName} · ${a.clientName}`,
        start: a.start,
        end: a.end,
        backgroundColor: a.status === 'confirmada' ? '#1F4A3C' : '#C45C26',
        extendedProps: { apt: a },
      }));
  }

  onEvent(info: EventClickArg): void {
    this.detail.set(info.event.extendedProps['apt'] as Hydrated);
  }

  addRule(): void {
    const v = this.slotForm.getRawValue();
    if (v.startTime >= v.endTime) {
      this.error.set('La hora de inicio debe ser anterior a la de fin.');
      return;
    }
    const next = [
      ...this.rules(),
      {
        id: `tmp-${Date.now()}`,
        vetId: this.user()!.id,
        weekday: v.weekday,
        startTime: v.startTime,
        endTime: v.endTime,
        slotMinutes: 30,
      },
    ];
    this.saveRules(next, 'Bloque de horario guardado.');
  }

  removeRule(id: string): void {
    this.saveRules(
      this.rules().filter((r) => r.id !== id),
      'Horario eliminado.',
    );
  }

  setStatus(status: Appointment['status']): void {
    const apt = this.detail();
    if (!apt) {
      return;
    }
    this.api.patchAppointment(apt.id, { status }).subscribe({
      next: (updated) => {
        this.detail.set({ ...apt, ...updated });
        this.api.appointments().subscribe((rows) => this.appointments.set(rows as Hydrated[]));
        this.ok.set('Cita actualizada.');
      },
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo actualizar.'),
    });
  }

  private saveRules(items: VetAvailability[], message: string): void {
    const id = this.user()?.id;
    if (!id) {
      return;
    }
    this.error.set('');
    this.api.saveAvailability(id, items).subscribe({
      next: (rows) => {
        this.rules.set(rows);
        this.ok.set(message);
      },
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo guardar la disponibilidad.'),
    });
  }
}
