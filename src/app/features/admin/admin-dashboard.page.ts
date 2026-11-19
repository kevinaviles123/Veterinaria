import { Component, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { ChartComponent } from '../../shared/chart.component';

@Component({
  selector: 'app-admin-dashboard',
  imports: [ChartComponent],
  template: `
    <h1 class="font-display text-4xl">Dashboard</h1>
    <p class="mt-2 text-ink-500">Citas, productos y altas de usuarios en tiempo real (datos del entorno demo).</p>
    @if (error()) {
      <p class="mt-4 rounded-2xl bg-clay-100 px-4 py-3 text-sm text-clay-700">{{ error() }}</p>
    }
    <section class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article class="card p-5"><p class="text-ink-500">Clientes</p><p class="font-display text-4xl">{{ totals().users }}</p></article>
      <article class="card p-5"><p class="text-ink-500">Veterinarios</p><p class="font-display text-4xl">{{ totals().vets }}</p></article>
      <article class="card p-5"><p class="text-ink-500">Citas activas</p><p class="font-display text-4xl">{{ totals().appointments }}</p></article>
      <article class="card p-5"><p class="text-ink-500">Productos</p><p class="font-display text-4xl">{{ totals().products }}</p></article>
    </section>
    <div class="mt-6 flex flex-wrap gap-2">
      @for (p of periods; track p.id) {
        <button class="chip" [class]="period() === p.id ? 'bg-pine-700 text-white' : 'bg-white'" type="button" (click)="setPeriod(p.id)">
          {{ p.label }}
        </button>
      }
    </div>
    <section class="mt-6 grid gap-6 lg:grid-cols-2">
      @if (appointmentsChart()) {
        <article class="card p-5">
          <h2 class="font-display text-2xl">Citas por {{ periodLabel() }}</h2>
          <app-chart class="mt-4 block" [config]="appointmentsChart()!" />
        </article>
      }
      @if (vetChart()) {
        <article class="card p-5">
          <h2 class="font-display text-2xl">Citas por veterinario</h2>
          <app-chart class="mt-4 block" [config]="vetChart()!" />
        </article>
      }
      @if (viewsChart()) {
        <article class="card p-5">
          <h2 class="font-display text-2xl">Productos más vistos</h2>
          <app-chart class="mt-4 block" [config]="viewsChart()!" />
        </article>
      }
      @if (soldChart()) {
        <article class="card p-5">
          <h2 class="font-display text-2xl">Productos más vendidos</h2>
          <app-chart class="mt-4 block" [config]="soldChart()!" />
        </article>
      }
      @if (usersChart()) {
        <article class="card p-5 lg:col-span-2">
          <h2 class="font-display text-2xl">Usuarios nuevos</h2>
          <app-chart class="mt-4 block" [config]="usersChart()!" />
        </article>
      }
    </section>
  `,
})
export class AdminDashboardPage {
  private readonly api = inject(ApiService);
  readonly error = signal('');
  readonly period = signal<'day' | 'week' | 'month'>('day');
  readonly periods = [
    { id: 'day' as const, label: 'Por día' },
    { id: 'week' as const, label: 'Por semana' },
    { id: 'month' as const, label: 'Por mes' },
  ];
  readonly totals = signal({ users: 0, vets: 0, appointments: 0, products: 0 });
  readonly appointmentsChart = signal<ChartConfiguration | null>(null);
  readonly vetChart = signal<ChartConfiguration | null>(null);
  readonly viewsChart = signal<ChartConfiguration | null>(null);
  readonly soldChart = signal<ChartConfiguration | null>(null);
  readonly usersChart = signal<ChartConfiguration | null>(null);
  private raw: {
    appointmentsByDay: Array<{ label: string; value: number }>;
    appointmentsByWeek: Array<{ label: string; value: number }>;
    appointmentsByMonth: Array<{ label: string; value: number }>;
    appointmentsByVet: Array<{ label: string; value: number }>;
    productsByViews: Array<{ label: string; value: number }>;
    productsBySold: Array<{ label: string; value: number }>;
    newUsers: Array<{ label: string; value: number }>;
  } | null = null;

  constructor() {
    this.api.adminStats().subscribe({
      next: (stats) => {
        this.totals.set(stats.totals);
        this.raw = stats;
        this.vetChart.set(this.bar('Citas', stats.appointmentsByVet, '#1F4A3C'));
        this.viewsChart.set(this.bar('Vistas', stats.productsByViews, '#2F6B54'));
        this.soldChart.set(this.bar('Ventas', stats.productsBySold, '#C45C26'));
        this.usersChart.set(this.line('Altas', stats.newUsers));
        this.renderAppointments();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo cargar el dashboard.'),
    });
  }

  setPeriod(id: 'day' | 'week' | 'month'): void {
    this.period.set(id);
    this.renderAppointments();
  }

  periodLabel(): string {
    return this.period() === 'day' ? 'día' : this.period() === 'week' ? 'semana' : 'mes';
  }

  renderAppointments(): void {
    if (!this.raw) {
      return;
    }
    const series =
      this.period() === 'week'
        ? this.raw.appointmentsByWeek
        : this.period() === 'month'
          ? this.raw.appointmentsByMonth
          : this.raw.appointmentsByDay;
    this.appointmentsChart.set(this.line('Citas', series));
  }

  private bar(label: string, rows: Array<{ label: string; value: number }>, color: string): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels: rows.map((r) => r.label),
        datasets: [{ label, data: rows.map((r) => r.value), backgroundColor: color, borderRadius: 12 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    };
  }

  private line(label: string, rows: Array<{ label: string; value: number }>): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels: rows.map((r) => r.label),
        datasets: [
          {
            label,
            data: rows.map((r) => r.value),
            borderColor: '#1F4A3C',
            backgroundColor: 'rgba(47,107,84,0.2)',
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    };
  }
}
