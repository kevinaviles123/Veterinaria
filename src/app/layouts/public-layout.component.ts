import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-paper-50 bg-grain">
      <header class="sticky top-0 z-30 border-b border-ink-100/70 bg-paper-50/85 backdrop-blur-md">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a routerLink="/" class="flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-2xl bg-pine-700 text-lg text-white">H</span>
            <div>
              <p class="font-display text-xl leading-none">Huella</p>
              <p class="text-[11px] uppercase tracking-[0.2em] text-ink-500">Ciclo de vida canino</p>
            </div>
          </a>
          <nav class="hidden items-center gap-6 text-sm md:flex">
            <a routerLink="/" routerLinkActive="text-pine-700" [routerLinkActiveOptions]="{ exact: true }" class="hover:text-pine-700">Inicio</a>
            <a routerLink="/explorar" routerLinkActive="text-pine-700" class="hover:text-pine-700">Memoriales</a>
            <a routerLink="/seguridad" routerLinkActive="text-pine-700" class="hover:text-pine-700">Privacidad</a>
          </nav>
          <div class="flex gap-2">
            <a routerLink="/ingresar" class="btn-ghost">Entrar</a>
            <a routerLink="/registro" class="btn-primary">Crear cuenta</a>
          </div>
        </div>
      </header>
      <router-outlet />
      <footer class="border-t border-ink-100 px-5 py-10 text-sm text-ink-500">
        <div class="mx-auto flex max-w-6xl flex-col justify-between gap-4 md:flex-row">
          <p>Huella protege los datos de las familias y sus perros. Frontend de demostración.</p>
          <p>© 2026 Portal canino</p>
        </div>
      </footer>
    </div>
  `,
})
export class PublicLayoutComponent {}
