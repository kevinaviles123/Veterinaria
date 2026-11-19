import { Component } from '@angular/core';

@Component({
  selector: 'app-privacy',
  template: `
    <section class="mx-auto max-w-3xl px-5 py-14">
      <h1 class="font-display text-5xl">Privacidad y seguridad</h1>
      <div class="prose mt-8 space-y-4 text-ink-700">
        <p>Las contraseñas se almacenan con hash SHA-256 y sal única. Nunca se guardan en texto plano.</p>
        <p>El acceso se separa por roles: dueño, veterinario y administrador. Un dueño solo ve sus perros.</p>
        <p>Las sesiones expiran a las 8 horas, viajan con token Bearer y un CSRF para escrituras.</p>
        <p>Los memoriales públicos ocultan datos del dueño. El resto del historial clínico permanece privado.</p>
        <p>Hay bloqueo temporal tras 5 intentos de login fallidos y una bitácora de cambios críticos.</p>
      </div>
    </section>
  `,
})
export class PrivacyPage {}
