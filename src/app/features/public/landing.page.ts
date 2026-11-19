import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <section class="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-2">
      <div>
        <p class="chip bg-pine-100 text-pine-700">Desde el bautizo hasta el memorial</p>
        <h1 class="mt-5 font-display text-5xl leading-[1.05] text-ink-950 md:text-6xl">
          El archivo vivo de tus perros, año por año.
        </h1>
        <p class="mt-5 max-w-xl text-lg text-ink-500">
          Huella guarda salud, comida, paseos, ropa, seguros y recuerdos en un mismo lugar, con
          acceso por roles y una zona pública para quien aún no tiene cuenta.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a routerLink="/registro" class="btn-primary">Registrar a mi perro</a>
          <a routerLink="/explorar" class="btn-ghost">Ver memoriales públicos</a>
        </div>
        <dl class="mt-10 grid grid-cols-3 gap-4 text-sm">
          <div><dt class="text-ink-300">Dueños</dt><dd class="text-2xl font-display">Privacidad</dd></div>
          <div><dt class="text-ink-300">Veterinarios</dt><dd class="text-2xl font-display">Clínica</dd></div>
          <div><dt class="text-ink-300">Admin</dt><dd class="text-2xl font-display">Gobierno</dd></div>
        </dl>
      </div>
      <div class="relative">
        <img
          class="h-[520px] w-full rounded-[2.5rem] object-cover shadow-soft"
          src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1400&q=80"
          alt="Dos perros dorados junto a su familia"
        />
        <div class="card absolute -bottom-6 left-6 right-6 p-5">
          <p class="text-xs uppercase tracking-[0.16em] text-ink-500">Trazabilidad</p>
          <p class="font-display text-2xl">Vacunas, peso, momentos y póliza en una línea de tiempo.</p>
        </div>
      </div>
    </section>
    <section class="mx-auto grid max-w-6xl gap-4 px-5 pb-20 md:grid-cols-3">
      @for (item of modules; track item.title) {
        <article class="card p-6">
          <p class="text-xs uppercase tracking-[0.16em] text-clay-500">{{ item.kicker }}</p>
          <h2 class="mt-2 font-display text-2xl">{{ item.title }}</h2>
          <p class="mt-2 text-sm text-ink-500">{{ item.text }}</p>
        </article>
      }
    </section>
  `,
})
export class LandingPage {
  readonly modules = [
    { kicker: 'Salud', title: 'Calendario de vacunas', text: 'Alertas de dosis próximas o vencidas, lote y veterinario responsable.' },
    { kicker: 'Vida diaria', title: 'Nutrición y actividad', text: 'Planes por etapa, comidas, peso y metas semanales de ejercicio.' },
    { kicker: 'Memoria', title: 'Momentos y adiós', text: 'Álbum familiar, seguro de vida y memorial con lugar de descanso.' },
  ];
}
