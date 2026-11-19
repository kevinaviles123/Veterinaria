import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ExportService } from '../../core/services/export.service';
import { StoreService } from '../../core/services/store.service';
import { Dog } from '../../core/models';

type Tab =
  | 'ficha'
  | 'salud'
  | 'comida'
  | 'actividad'
  | 'gustos'
  | 'ropa'
  | 'momentos'
  | 'seguro'
  | 'memorial';

@Component({
  selector: 'app-dog-detail',
  imports: [DatePipe, DecimalPipe],
  template: `
    @if (dog(); as dog) {
      <section class="overflow-hidden rounded-[2rem] bg-ink-950 text-white">
        <div class="grid md:grid-cols-[1.2fr_0.8fr]">
          <img [src]="dog.photos[0]" [alt]="dog.name" class="h-72 w-full object-cover md:h-full" />
          <div class="p-8">
            <p class="text-xs uppercase tracking-[0.2em] text-clay-300">{{ dog.breed }}</p>
            <h1 class="font-display text-5xl">{{ dog.name }}</h1>
            <p class="mt-2 text-white/70">{{ dog.birthPlace }} · {{ dog.birthDate | date }}</p>
            <div class="mt-6 flex flex-wrap gap-2">
              <button class="btn-accent" type="button" (click)="exportCsv(dog)">Excel / CSV</button>
              <button class="btn-ghost !text-ink-900" type="button" (click)="exportPdf(dog)">PDF</button>
            </div>
          </div>
        </div>
      </section>

      <div class="mt-6 flex gap-2 overflow-x-auto pb-2">
        @for (t of tabs; track t.id) {
          <button class="chip whitespace-nowrap" [class]="tab() === t.id ? 'bg-pine-700 text-white' : 'bg-white'" (click)="tab.set(t.id)">
            {{ t.label }}
          </button>
        }
      </div>

      @switch (tab()) {
        @case ('ficha') {
          <div class="mt-6 grid gap-6 lg:grid-cols-2">
            <article class="card p-6">
              <h2 class="font-display text-2xl">Origen</h2>
              <p class="mt-2">{{ dog.origin }}</p>
              <p class="mt-4 text-sm text-ink-500">Madre: {{ dog.mother?.name || '—' }} ({{ dog.mother?.breed || 'n/d' }})</p>
              <p class="text-sm text-ink-500">Padre: {{ dog.father?.name || '—' }} ({{ dog.father?.breed || 'n/d' }})</p>
            </article>
            <article class="card p-6">
              <h2 class="font-display text-2xl">Bautizo / nombre</h2>
              @if (dog.baptism; as b) {
                <p>{{ b.assignedName }}</p>
                <p class="text-sm text-ink-500">{{ b.date | date }}</p>
                <p class="mt-2">{{ b.notes }}</p>
              } @else {
                <p>Sin ceremonia registrada.</p>
              }
            </article>
            <article class="card p-6 lg:col-span-2">
              <h2 class="font-display text-2xl">Alergias y restricciones</h2>
              <p>Alergias: {{ dog.allergies.join(', ') || 'Ninguna' }}</p>
              <p>Restricciones: {{ dog.restrictions.join(', ') || 'Ninguna' }}</p>
              <p>Comida favorita: {{ dog.favoriteFood || '—' }}</p>
            </article>
          </div>
        }
        @case ('salud') {
          <div class="mt-6 grid gap-6 lg:grid-cols-2">
            <article class="card p-6">
              <div class="flex items-center justify-between">
                <h2 class="font-display text-2xl">Vacunas</h2>
                @if (canHealth()) {
                  <button class="btn-ghost" type="button" (click)="addVaccine(dog)">+ Dosis</button>
                }
              </div>
              <ul class="mt-4 space-y-3">
                @for (v of vaccines(); track v.id) {
                  <li class="rounded-2xl bg-paper-100 p-4">
                    <div class="flex justify-between">
                      <strong>{{ v.type }}</strong>
                      <span class="chip" [class]="v.status === 'aplicada' ? 'bg-pine-100 text-pine-700' : v.status === 'vencida' ? 'bg-clay-100 text-clay-700' : 'bg-white'">{{ v.status }}</span>
                    </div>
                    <p class="text-sm text-ink-500">{{ v.scheduledDate }} · {{ v.veterinarian }} · lote {{ v.lot }}</p>
                    @if (canHealth() && v.status !== 'aplicada') {
                      <button class="btn-ghost mt-2" type="button" (click)="applyVaccine(v.id)">Marcar aplicada</button>
                    }
                  </li>
                }
              </ul>
            </article>
            <article class="card p-6">
              <div class="flex items-center justify-between">
                <h2 class="font-display text-2xl">Consultas</h2>
                @if (canHealth()) {
                  <button class="btn-ghost" type="button" (click)="addConsult(dog)">+ Consulta</button>
                }
              </div>
              <ul class="mt-4 space-y-3">
                @for (m of medical(); track m.id) {
                  <li class="rounded-2xl bg-paper-100 p-4">
                    <p class="font-medium">{{ m.diagnosis }}</p>
                    <p class="text-sm text-ink-500">{{ m.date | date }} · {{ m.veterinarian }}</p>
                    <p class="text-sm">{{ m.medications }}</p>
                  </li>
                }
              </ul>
            </article>
          </div>
        }
        @case ('comida') {
          <div class="mt-6 grid gap-6 lg:grid-cols-2">
            <article class="card p-6">
              <h2 class="font-display text-2xl">Plan por etapa</h2>
              @for (p of plans(); track p.id) {
                <div class="mt-4 rounded-2xl bg-paper-100 p-4">
                  <p class="font-medium">{{ p.stage }} · {{ p.kcalPerDay }} kcal</p>
                  <p class="text-sm">{{ p.description }}</p>
                </div>
              }
            </article>
            <article class="card p-6">
              <div class="flex justify-between">
                <h2 class="font-display text-2xl">Comidas</h2>
                <button class="btn-ghost" type="button" (click)="addMeal(dog)">+ Registro</button>
              </div>
              @for (m of meals(); track m.id) {
                <p class="mt-3 rounded-2xl bg-paper-100 px-4 py-3 text-sm">{{ m.date }} {{ m.time }} · {{ m.brand }} · {{ m.portionGrams }} g</p>
              }
            </article>
          </div>
        }
        @case ('actividad') {
          <div class="mt-6 grid gap-6">
            <article class="card p-6">
              <h2 class="font-display text-2xl">Peso</h2>
              <svg viewBox="0 0 320 120" class="mt-4 h-40 w-full">
                <polyline fill="none" stroke="#2F6B54" stroke-width="3" [attr.points]="weightPoints()" />
              </svg>
              <div class="mt-2 flex flex-wrap gap-2 text-xs text-ink-500">
                @for (w of weights(); track w.id) {
                  <span>{{ w.date }}: {{ w.kg | number: '1.1-1' }} kg</span>
                }
              </div>
              <button class="btn-ghost mt-4" type="button" (click)="addWeight(dog)">+ Peso</button>
            </article>
            <article class="card p-6">
              <div class="flex justify-between"><h2 class="font-display text-2xl">Ejercicio y metas</h2>
                <button class="btn-ghost" type="button" (click)="addExercise(dog)">+ Ejercicio</button></div>
              @for (e of exercises(); track e.id) {
                <p class="mt-3 text-sm">{{ e.date }} · {{ e.type }} · {{ e.minutes }} min · {{ e.intensity }}</p>
              }
              @for (g of goals(); track g.id) {
                <div class="mt-4">
                  <p class="text-sm">{{ g.title }} ({{ g.period }})</p>
                  <div class="mt-1 h-2 rounded-full bg-paper-200"><div class="h-2 rounded-full bg-pine-500" [style.width.%]="g.progress"></div></div>
                </div>
              }
            </article>
          </div>
        }
        @case ('gustos') {
          <div class="card mt-6 p-6">
            <div class="flex justify-between"><h2 class="font-display text-2xl">Gustos y premios</h2>
              <button class="btn-ghost" type="button" (click)="addPref(dog)">+ Gusto</button></div>
            <div class="mt-4 grid gap-3 md:grid-cols-2">
              @for (p of prefs(); track p.id) {
                <div class="rounded-2xl bg-paper-100 p-4">
                  <p class="text-xs uppercase tracking-widest text-ink-500">{{ p.category }}</p>
                  <p class="font-medium">{{ p.name }}</p>
                  <p class="text-sm">{{ p.notes }}</p>
                </div>
              }
            </div>
          </div>
        }
        @case ('ropa') {
          <div class="mt-6 grid gap-4 md:grid-cols-3">
            @for (w of wardrobe(); track w.id) {
              <article class="card overflow-hidden">
                <img [src]="w.photo" [alt]="w.name" class="h-40 w-full object-cover" />
                <div class="p-4">
                  <p class="font-medium">{{ w.name }}</p>
                  <p class="text-sm text-ink-500">{{ w.type }} · talla {{ w.size }} · {{ w.color }}</p>
                </div>
              </article>
            }
          </div>
        }
        @case ('momentos') {
          <div class="mt-6 grid gap-6 md:grid-cols-2">
            @for (m of moments(); track m.id) {
              <article class="card overflow-hidden">
                <img [src]="m.photo" [alt]="m.comment" class="h-56 w-full object-cover" />
                <div class="p-5">
                  <p class="text-sm text-ink-500">{{ m.date | date }} · {{ m.people }}</p>
                  <p class="mt-2">{{ m.comment }}</p>
                </div>
              </article>
            }
          </div>
        }
        @case ('seguro') {
          <div class="mt-6 grid gap-6 lg:grid-cols-2">
            @for (ins of insurances(); track ins.id) {
              <article class="card p-6">
                <h2 class="font-display text-2xl">{{ ins.insurer }}</h2>
                <p class="text-sm">Póliza {{ ins.policyNumber }} · {{ ins.status }}</p>
                <p class="mt-2">Vigencia {{ ins.startDate }} — {{ ins.endDate }}</p>
                <p>Valor asegurado {{ ins.value | number }}</p>
                <p class="text-sm text-ink-500">{{ ins.conditions }}</p>
              </article>
            }
            <article class="card p-6">
              <h2 class="font-display text-2xl">Pagos y reclamos</h2>
              @for (p of payments(); track p.id) {
                <p class="mt-2 text-sm">{{ p.date }} · {{ p.amount | number }} · {{ p.method }}</p>
              }
              @for (c of claims(); track c.id) {
                <p class="mt-2 text-sm">{{ c.date }} · {{ c.event }} · {{ c.status }}</p>
              }
            </article>
          </div>
        }
        @case ('memorial') {
          <div class="card mt-6 p-6">
            @if (memorial(); as mem) {
              <h2 class="font-display text-3xl">Memorial de {{ dog.name }}</h2>
              <p class="mt-2">{{ mem.deathDate }} · {{ mem.cause }}</p>
              <p class="mt-4">{{ mem.tribute }}</p>
              <p class="mt-4 text-sm">{{ mem.cemetery }} — {{ mem.locationRef }}</p>
              <p class="text-sm">{{ mem.contact }}</p>
            } @else {
              <p>Este perro sigue en su etapa de vida. El memorial se activa al registrar el adiós.</p>
              @if (auth.user()?.role === 'owner') {
                <button class="btn-accent mt-4" type="button" (click)="openMemorial(dog)">Registrar etapa final</button>
              }
            }
          </div>
        }
      }
    } @else {
      <p>No tienes acceso a este expediente.</p>
    }
  `,
})
export class DogDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(StoreService);
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly exporter = inject(ExportService);
  readonly tab = signal<Tab>('ficha');
  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'ficha', label: 'Ficha' },
    { id: 'salud', label: 'Salud' },
    { id: 'comida', label: 'Alimentación' },
    { id: 'actividad', label: 'Crecimiento' },
    { id: 'gustos', label: 'Gustos' },
    { id: 'ropa', label: 'Ropa' },
    { id: 'momentos', label: 'Momentos' },
    { id: 'seguro', label: 'Seguro' },
    { id: 'memorial', label: 'Memorial' },
  ];

  readonly dog = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    const dog = this.store.state().dogs.find((d) => d.id === id);
    if (!dog || !this.auth.canAccessDog(dog)) {
      return null;
    }
    return dog;
  });

  readonly vaccines = computed(() => this.store.state().vaccines.filter((x) => x.dogId === this.dog()?.id));
  readonly medical = computed(() => this.store.state().medical.filter((x) => x.dogId === this.dog()?.id));
  readonly plans = computed(() => this.store.state().feedingPlans.filter((x) => x.dogId === this.dog()?.id));
  readonly meals = computed(() => this.store.state().meals.filter((x) => x.dogId === this.dog()?.id));
  readonly weights = computed(() => this.store.state().weights.filter((x) => x.dogId === this.dog()?.id));
  readonly exercises = computed(() => this.store.state().exercises.filter((x) => x.dogId === this.dog()?.id));
  readonly goals = computed(() => this.store.state().goals.filter((x) => x.dogId === this.dog()?.id));
  readonly prefs = computed(() => this.store.state().preferences.filter((x) => x.dogId === this.dog()?.id));
  readonly wardrobe = computed(() => this.store.state().wardrobe.filter((x) => x.dogId === this.dog()?.id));
  readonly moments = computed(() => this.store.state().moments.filter((x) => x.dogId === this.dog()?.id));
  readonly insurances = computed(() => this.store.state().insurances.filter((x) => x.dogId === this.dog()?.id));
  readonly payments = computed(() => {
    const ids = this.insurances().map((i) => i.id);
    return this.store.state().payments.filter((p) => ids.includes(p.insuranceId));
  });
  readonly claims = computed(() => {
    const ids = this.insurances().map((i) => i.id);
    return this.store.state().claims.filter((c) => ids.includes(c.insuranceId));
  });
  readonly memorial = computed(() => this.store.state().memorials.find((m) => m.dogId === this.dog()?.id) ?? null);
  readonly canHealth = computed(() => {
    const dog = this.dog();
    return !!dog && this.auth.canWriteHealth(dog);
  });

  weightPoints(): string {
    const data = this.weights();
    if (!data.length) {
      return '';
    }
    const min = Math.min(...data.map((d) => d.kg));
    const max = Math.max(...data.map((d) => d.kg));
    return data
      .map((d, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * 300 + 10;
        const y = 100 - ((d.kg - min) / Math.max(max - min, 0.1)) * 80;
        return `${x},${y}`;
      })
      .join(' ');
  }

  addVaccine(dog: Dog): void {
    const type = prompt('Tipo de vacuna');
    if (!type) {
      return;
    }
    this.api
      .add(dog.id, 'vaccines', {
        type,
        scheduledDate: new Date().toISOString().slice(0, 10),
        veterinarian: this.auth.user()?.fullName,
        lot: 'LOT-NEW',
        notes: '',
        status: 'programada',
      })
      .subscribe();
  }

  applyVaccine(id: string): void {
    this.api
      .patch('vaccines', id, { status: 'aplicada', appliedDate: new Date().toISOString().slice(0, 10) })
      .subscribe();
  }

  addConsult(dog: Dog): void {
    const diagnosis = prompt('Diagnóstico');
    if (!diagnosis) {
      return;
    }
    this.api
      .add(dog.id, 'medical', {
        date: new Date().toISOString().slice(0, 10),
        veterinarian: this.auth.user()?.fullName,
        diagnosis,
        medications: 'Según receta',
        notes: '',
      })
      .subscribe();
  }

  addMeal(dog: Dog): void {
    this.api
      .add(dog.id, 'meals', {
        date: new Date().toISOString().slice(0, 10),
        time: '12:00',
        type: 'Almuerzo',
        brand: 'Casa',
        portionGrams: 150,
      })
      .subscribe();
  }

  addWeight(dog: Dog): void {
    const kg = Number(prompt('Peso en kg', '25'));
    if (!kg) {
      return;
    }
    this.api.add(dog.id, 'weights', { date: new Date().toISOString().slice(0, 10), kg }).subscribe();
  }

  addExercise(dog: Dog): void {
    this.api
      .add(dog.id, 'exercises', {
        date: new Date().toISOString().slice(0, 10),
        type: 'Caminata',
        minutes: 30,
        intensity: 'media',
      })
      .subscribe();
  }

  addPref(dog: Dog): void {
    const name = prompt('Nombre del gusto');
    if (!name) {
      return;
    }
    this.api.add(dog.id, 'preferences', { category: 'gusto', name, notes: '' }).subscribe();
  }

  openMemorial(dog: Dog): void {
    if (!confirm('¿Registrar el fallecimiento? Esta acción marca el expediente como memorial.')) {
      return;
    }
    this.api
      .add(dog.id, 'memorial', {
        deathDate: new Date().toISOString().slice(0, 10),
        cause: 'No especificada',
        notes: '',
        cemetery: 'Por definir',
        locationRef: '',
        contact: this.auth.user()?.phone,
        tribute: `Gracias, ${dog.name}.`,
      })
      .subscribe();
  }

  exportCsv(dog: Dog): void {
    this.exporter.csv(`${dog.name}-vacunas.csv`, this.vaccines() as unknown as Record<string, unknown>[]);
    this.exporter.json(`${dog.name}-historial.json`, {
      dog,
      vaccines: this.vaccines(),
      medical: this.medical(),
      weights: this.weights(),
    });
  }

  exportPdf(dog: Dog): void {
    this.exporter.printHistory(dog, {
      dog,
      vaccines: this.vaccines(),
      medical: this.medical(),
      memorial: this.memorial(),
    });
  }
}
