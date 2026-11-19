# Pantallas y navegación

## Invitado (sin cuenta)

```
/                    Landing editorial
/explorar            Memoriales públicos
/memorial/:id        Ficha memorial (solo si publicMemorial)
/seguridad           Privacidad
/ingresar            Login + credenciales demo
/registro            Alta de dueño
```

## Dueño

```
/app/inicio          Resumen, perros, alertas
/app/perros          Manada
/app/perros/nuevo    Alta
/app/perros/:id      Expediente con pestañas:
                       Ficha, Salud, Alimentación, Crecimiento,
                       Gustos, Ropa, Momentos, Seguro, Memorial
/app/alertas         Vacunas próximas / vencidas
/app/perfil          Datos personales y dirección
```

## Veterinario

```
/app/vet             Agenda y pacientes asignados
/app/perros/:id      Puede escribir vacunas y consultas
```

## Administrador

```
/app/admin           Gobierno
  usuarios           Activar / bloquear
  catalogos          Razas, vacunas, alimentos, aseguradoras
  auditoria          Bitácora
/app/perfil          Perfil del admin
```

## Flujo principal

1. Invitado explora memoriales o crea cuenta de dueño.
2. Dueño registra perro → completa bautizo, salud, comida, peso, momentos, seguro.
3. Veterinario aplica vacunas y deja consultas.
4. Alertas avisan dosis vencidas.
5. Exportación CSV/JSON/PDF del historial.
6. Etapa final → memorial (opcionalmente público).
7. Admin gobierna usuarios y catálogos.
