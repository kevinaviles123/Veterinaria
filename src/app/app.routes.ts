import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/landing.page').then((m) => m.LandingPage) },
      { path: 'explorar', loadComponent: () => import('./features/public/explore.page').then((m) => m.ExplorePage) },
      { path: 'memorial/:id', loadComponent: () => import('./features/public/memorial.page').then((m) => m.PublicMemorialPage) },
      { path: 'seguridad', loadComponent: () => import('./features/public/privacy.page').then((m) => m.PrivacyPage) },
      {
        path: 'ingresar',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'registro',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
      },
    ],
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadComponent: () => import('./features/home/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'perros', loadComponent: () => import('./features/dogs/dogs.page').then((m) => m.DogsPage) },
      {
        path: 'perros/nuevo',
        canActivate: [roleGuard(['owner', 'admin'])],
        loadComponent: () => import('./features/dogs/dog-new.page').then((m) => m.DogNewPage),
      },
      { path: 'perros/:id', loadComponent: () => import('./features/dogs/dog-detail.page').then((m) => m.DogDetailPage) },
      { path: 'alertas', loadComponent: () => import('./features/alerts/alerts.page').then((m) => m.AlertsPage) },
      { path: 'perfil', loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage) },
      {
        path: 'citas',
        loadComponent: () => import('./features/appointments/my-appointments.page').then((m) => m.MyAppointmentsPage),
      },
      {
        path: 'citas/agendar',
        loadComponent: () =>
          import('./features/appointments/book-appointment.page').then((m) => m.BookAppointmentPage),
      },
      {
        path: 'citas/agendar/:vetId',
        loadComponent: () =>
          import('./features/appointments/book-appointment.page').then((m) => m.BookAppointmentPage),
      },
      {
        path: 'productos',
        loadComponent: () => import('./features/products/catalog.page').then((m) => m.CatalogPage),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/admin/admin-dashboard.page').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'admin/usuarios',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
      },
      {
        path: 'admin/catalogos',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
      },
      {
        path: 'admin/auditoria',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
      },
      {
        path: 'admin/productos',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/admin/admin-products.page').then((m) => m.AdminProductsPage),
      },
      {
        path: 'admin/citas',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/appointments/my-appointments.page').then((m) => m.MyAppointmentsPage),
      },
      {
        path: 'vet',
        canActivate: [roleGuard(['vet', 'admin'])],
        loadComponent: () => import('./features/vet/vet.page').then((m) => m.VetPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
