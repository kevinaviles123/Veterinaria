import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ROLE_LABEL } from '../core/models';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-paper-50 bg-grain md:grid md:grid-cols-[260px_1fr]">
      <aside class="border-b border-ink-100 bg-white/80 p-5 md:min-h-screen md:border-b-0 md:border-r">
        <a routerLink="/app/inicio" class="mb-8 flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-2xl bg-pine-700 text-white">H</span>
          <div>
            <p class="font-display text-xl leading-none">Huella</p>
            <p class="text-[11px] uppercase tracking-[0.18em] text-ink-500">{{ roleLabel() }}</p>
          </div>
        </a>
        <nav class="grid gap-1 text-sm">
          @for (item of nav(); track item.to) {
            <a
              [routerLink]="item.to"
              routerLinkActive="bg-pine-700 text-white"
              class="rounded-2xl px-4 py-2.5 text-ink-700 hover:bg-paper-100"
            >
              {{ item.label }}
            </a>
          }
        </nav>
        <button class="btn-ghost mt-8 w-full" type="button" (click)="logout()">Cerrar sesión</button>
      </aside>
      <div class="min-w-0">
        <header class="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <p class="text-xs uppercase tracking-[0.16em] text-ink-500">Sesión segura</p>
            <p class="font-medium">{{ user()?.fullName }}</p>
          </div>
          <a routerLink="/app/perfil" class="chip bg-clay-100 text-clay-700">Perfil</a>
        </header>
        <main class="p-5 md:p-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  readonly roleLabel = computed(() => ROLE_LABEL[this.user()?.role ?? 'guest']);
  readonly nav = computed(() => {
    const role = this.user()?.role;
    const base = [
      { to: '/app/inicio', label: 'Resumen' },
      { to: '/app/perros', label: 'Mis perros' },
      { to: '/app/citas', label: 'Mis citas' },
      { to: '/app/productos', label: 'Catálogo' },
      { to: '/app/alertas', label: 'Vacunas y alertas' },
      { to: '/app/perfil', label: 'Mi perfil' },
    ];
    if (role === 'vet') {
      return [
        { to: '/app/vet', label: 'Agenda clínica' },
        { to: '/app/citas', label: 'Citas' },
        { to: '/app/perros', label: 'Pacientes' },
        { to: '/app/productos', label: 'Catálogo' },
        { to: '/app/alertas', label: 'Vacunas' },
        { to: '/app/perfil', label: 'Perfil profesional' },
      ];
    }
    if (role === 'admin') {
      return [
        { to: '/app/admin', label: 'Dashboard' },
        { to: '/app/admin/usuarios', label: 'Usuarios' },
        { to: '/app/admin/citas', label: 'Citas' },
        { to: '/app/admin/productos', label: 'Productos' },
        { to: '/app/admin/catalogos', label: 'Catálogos' },
        { to: '/app/admin/auditoria', label: 'Auditoría' },
        { to: '/app/perfil', label: 'Perfil' },
      ];
    }
    return base;
  });

  logout(): void {
    this.api.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => this.router.navigateByUrl('/'),
    });
  }
}
