# Huella — portal del ciclo de vida canino

Frontend Angular 19 + Tailwind CSS para registrar perros desde el nacimiento hasta el memorial. Incluye zona pública (sin cuenta), dueños, veterinarios y un administrador con credencial propia.

## Arranque

```bash
npm install
npm start
```

Abre `http://localhost:4200/`.

## Credenciales demo

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@huella.local | Admin#2026! |
| Cliente | maria.gomez@huella.local | Duenio#2026! |
| Veterinaria | laura.vet@huella.local | Vet#2026! |
| Veterinario | andres.vet@huella.local | Vet#2026! |

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md)
- [Pantallas y navegación](docs/PANTALLAS.md)
- [Endpoints API](docs/API.md)
- [Datos de prueba](docs/DATOS-PRUEBA.md)

## Notas

El API vive en un interceptor (`/api/*`) y persiste en el navegador. Sustitúyelo por un backend real cuando lo necesites; el contrato ya está definido.
