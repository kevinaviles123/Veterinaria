# Endpoints API (contrato usado por el frontend)

Base: `/api`. Autenticación: `Authorization: Bearer <token>` y `X-CSRF-Token` en POST/PUT/PATCH/DELETE.

## Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/register` | Alta dueño `{ fullName, email, password, phone }` |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/auth/me` | Usuario de la sesión |

## Público

| GET | `/api/public/memorials` | Memoriales opt-in (sin auth) |

## Perfil y usuarios

| GET | `/api/profile` | Perfil propio |
| PUT | `/api/profile` | Actualiza nombre, teléfono, dirección |
| GET | `/api/users` | Lista (admin) |
| PATCH | `/api/users/:id` | `{ status, role }` (admin) |

## Perros

| GET | `/api/dogs` | Visibles según rol |
| POST | `/api/dogs` | Alta |
| GET | `/api/dogs/:id` | Expediente hidratado |
| PUT | `/api/dogs/:id` | Actualiza ficha |
| DELETE | `/api/dogs/:id` | Baja |
| GET | `/api/dogs/:id/export` | Payload para PDF/Excel |

## Colecciones del perro

Prefijo `GET|POST /api/dogs/:id/{col}` y mutación `PUT|DELETE /api/{recurso}/:id`.

| col | recurso | Contenido |
|---|---|---|
| vaccines | vaccines | Calendario de vacunas |
| medical | medical | Consultas |
| feeding | feedingPlans | Plan nutricional |
| meals | meals | Comidas |
| weights | weights | Peso |
| exercises | exercises | Ejercicio |
| goals | goals | Metas |
| preferences | preferences | Gustos |
| wardrobe | wardrobe | Ropa y accesorios |
| moments | moments | Fotos y comentarios |
| insurance | insurances | Pólizas |
| memorial | memorials | Etapa final |

Pagos/reclamos: `PUT/DELETE /api/payments/:id`, `/api/claims/:id`.

## Gobierno

| GET/POST | `/api/catalogs` | Catálogos (POST admin) |
| GET | `/api/audit` | Bitácora (admin) |
| GET | `/api/alerts` | Vacunas pendientes del actor |
