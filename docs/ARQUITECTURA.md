# Arquitectura frontend — Huella

Aplicación **solo frontend** (Angular 19 + Tailwind CSS) con un **backend simulado** en el interceptor HTTP. El contrato de API queda listo para sustituir el mock por un servidor real (Nest, .NET, etc.) sin reescribir las pantallas.

## Principios

- Componentes *standalone* y rutas perezosas (`loadComponent`).
- Capa `core` sin UI: modelos, seguridad, guards, interceptores, store.
- Capa `features` por dominio (dueño, perro, salud, admin, vet, público).
- Autorización en **ruta** (guards) y en **API mock** (403 si el rol no corresponde).
- Privacidad: un dueño no ve perros ajenos; el veterinario solo pacientes asignados; el memorial público oculta datos del dueño.

## Diagrama lógico

```
Navegador
  └─ Angular (Huella)
       ├─ PublicLayout   → marketing, memoriales, login, registro
       ├─ ShellLayout    → app autenticada
       ├─ AuthInterceptor → Bearer + X-CSRF-Token
       ├─ MockApiInterceptor → /api/*
       └─ StoreService (localStorage) + hashes SHA-256
```

Cuando exista backend, se elimina `MockApiInterceptor` y `provideHttpClient` apuntará al origen real.

## Capas

| Carpeta | Responsabilidad |
|---|---|
| `core/models` | Contratos de dominio |
| `core/security` | Hash de contraseñas, comparación en tiempo constante |
| `core/services` | Store, sesión, auth, auditoría, exportación, API |
| `core/guards` | Sesión y roles |
| `core/interceptors` | Token + mock REST |
| `layouts` | Cascarones público y privado |
| `features/*` | Pantallas |

## Seguridad (frontend + mock)

1. Contraseñas **nunca** en texto plano: sal aleatoria + SHA-256 (en producción el hash debe vivir en servidor con Argon2/bcrypt).
2. Sesión de 8 h en `sessionStorage` (no `localStorage` para el token).
3. CSRF sintético en verbos de escritura.
4. Bloqueo temporal a los 5 logins fallidos.
5. Guards de ruta + comprobación en cada endpoint.
6. Cabeceras CSP, nosniff y referrer en `index.html`.
7. Auditoría de login, altas, bajas y cambios de perfil/perros.
8. Exportación cliente (CSV/JSON/PDF vía impresión) del historial del perro.

## Persistencia demo

Clave `huella.store.v1` en `localStorage`. El administrador puede restablecer el semillero.
