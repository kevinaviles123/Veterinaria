import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { Appointment, AppointmentStatus, Product, User, VetAvailability } from '../models';
import { AuditService } from '../services/audit.service';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { StoreService } from '../services/store.service';
import { decorateSlots, isWithinAvailability, rangeDates, vetBusy } from './slots';

function json<T>(body: T, status = 200): HttpResponse<T> {
  return new HttpResponse({ status, body });
}

function fail(status: number, message: string) {
  return throwError(() => new HttpErrorResponse({ status, statusText: 'Error', error: { message } }));
}

function match(url: string, pattern: string): Record<string, string> | null {
  const a = url.replace(/\/$/, '').split('/').filter(Boolean);
  const b = pattern.split('/').filter(Boolean);
  if (a.length !== b.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (let i = 0; i < b.length; i += 1) {
    if (b[i].startsWith(':')) {
      params[b[i].slice(1)] = a[i];
    } else if (a[i] !== b[i]) {
      return null;
    }
  }
  return params;
}

function query(req: HttpRequest<unknown>): URLSearchParams {
  const params = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');
  req.params.keys().forEach((key) => {
    const value = req.params.get(key);
    if (value) {
      params.set(key, value);
    }
  });
  return params;
}

function publicUser(user: User) {
  const { passwordHash, passwordSalt, failedAttempts, lockedUntil, ...safe } = user;
  return safe;
}

function hydrateAppointment(store: StoreService, apt: Appointment) {
  const s = store.state();
  const client = s.users.find((u) => u.id === apt.clientId);
  const vet = s.users.find((u) => u.id === apt.vetId);
  const dog = s.dogs.find((d) => d.id === apt.dogId);
  return {
    ...apt,
    clientName: client?.fullName ?? '—',
    clientEmail: client?.email ?? '',
    vetName: vet?.fullName ?? '—',
    dogName: dog?.name ?? '—',
    dogBreed: dog?.breed ?? '',
  };
}

function canSeeAppointment(auth: AuthService, apt: Appointment): boolean {
  const user = auth.user();
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  if (user.role === 'vet') {
    return apt.vetId === user.id;
  }
  return apt.clientId === user.id;
}

function canMutateAppointment(auth: AuthService, apt: Appointment): boolean {
  const user = auth.user();
  if (!user) {
    return false;
  }
  if (user.role === 'admin' || (user.role === 'vet' && apt.vetId === user.id)) {
    return true;
  }
  return user.role === 'owner' && apt.clientId === user.id;
}

export function handleClinic(
  req: HttpRequest<unknown>,
  store: StoreService,
  session: SessionService,
  audit: AuditService,
  auth: AuthService,
): Observable<HttpResponse<unknown>> | null {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();
  const body = (req.body ?? {}) as Record<string, unknown>;
  const s = store.state();

  if (method === 'POST' && url === '/api/users') {
    if (!auth.can(['admin'])) {
      return fail(403, 'Solo el administrador puede crear usuarios.');
    }
    return new Observable((sub) => {
      auth
        .provision({
          fullName: String(body['fullName'] ?? ''),
          email: String(body['email'] ?? ''),
          password: String(body['password'] ?? ''),
          phone: String(body['phone'] ?? ''),
          role: (body['role'] as User['role']) === 'vet' ? 'vet' : 'owner',
          vetClinic: body['vetClinic'] ? String(body['vetClinic']) : undefined,
          licenseNumber: body['licenseNumber'] ? String(body['licenseNumber']) : undefined,
        })
        .then((res) => {
          if (!res.ok || !res.user) {
            sub.error({ status: 400, error: { message: res.message } });
            return;
          }
          sub.next(json(publicUser(res.user), 201));
          sub.complete();
        });
    });
  }

  if (method === 'GET' && url === '/api/vets') {
    return of(json(s.users.filter((u) => u.role === 'vet' && u.status === 'activo').map(publicUser)));
  }

  let params = match(url, '/api/vets/:id/availability');
  if (params) {
    const vetId = params['id'];
    const vet = s.users.find((u) => u.id === vetId && u.role === 'vet');
    if (!vet) {
      return fail(404, 'Veterinario no encontrado.');
    }
    if (method === 'GET') {
      return of(json(s.availability.filter((a) => a.vetId === vetId)));
    }
    if (method === 'PUT') {
      const actor = auth.user();
      if (!actor || (actor.role !== 'admin' && !(actor.role === 'vet' && actor.id === vetId))) {
        return fail(403, 'No puedes editar esta disponibilidad.');
      }
      const items = (body['items'] as Array<Record<string, unknown>>) ?? [];
      const next: VetAvailability[] = items.map((item) => ({
        id: String(item['id'] ?? store.id('av')),
        vetId,
        weekday: Number(item['weekday']),
        startTime: String(item['startTime'] ?? '08:00'),
        endTime: String(item['endTime'] ?? '17:00'),
        slotMinutes: Number(item['slotMinutes'] ?? 30),
      }));
      if (next.some((r) => r.startTime >= r.endTime || r.weekday < 0 || r.weekday > 6)) {
        return fail(400, 'Horario inválido.');
      }
      store.patch((st) => {
        st.availability = [...st.availability.filter((a) => a.vetId !== vetId), ...next];
      });
      audit.log('AVAILABILITY_UPDATE', 'vet', vetId, `${next.length} bloques`);
      return of(json(next));
    }
  }

  params = match(url, '/api/vets/:id/slots');
  if (params && method === 'GET') {
    const vetId = params['id'];
    const q = query(req);
    const from = q.get('from') ?? new Date().toISOString().slice(0, 10);
    const to = q.get('to') ?? from;
    const rules = s.availability.filter((a) => a.vetId === vetId);
    const slots = rangeDates(from, to).flatMap((date) => decorateSlots(date, rules, s.appointments, vetId));
    return of(json(slots));
  }

  if (method === 'GET' && url === '/api/appointments') {
    const list = s.appointments.filter((a) => canSeeAppointment(auth, a)).map((a) => hydrateAppointment(store, a));
    return of(json(list));
  }

  if (method === 'POST' && url === '/api/appointments') {
    const actor = auth.user();
    if (!actor) {
      return fail(401, 'No autenticado.');
    }
    const vetId = String(body['vetId'] ?? '');
    const dogId = String(body['dogId'] ?? '');
    const start = String(body['start'] ?? '');
    const end = String(body['end'] ?? '');
    const reason = String(body['reason'] ?? '').trim();
    const clientId =
      actor.role === 'owner' ? actor.id : String(body['clientId'] ?? (actor.role === 'vet' ? '' : actor.id));
    if (!vetId || !dogId || !start || !end || !reason) {
      return fail(400, 'Completa veterinario, mascota, horario y motivo.');
    }
    const dog = s.dogs.find((d) => d.id === dogId);
    if (!dog) {
      return fail(404, 'Mascota no encontrada.');
    }
    if (actor.role === 'owner' && dog.ownerId !== actor.id) {
      return fail(403, 'Solo puedes agendar para tus mascotas.');
    }
    if (actor.role === 'vet' && !clientId) {
      return fail(400, 'Indica el cliente.');
    }
    const ownerId = actor.role === 'owner' ? actor.id : clientId;
    if (dog.ownerId !== ownerId) {
      return fail(400, 'La mascota no pertenece a ese cliente.');
    }
    const rules = s.availability.filter((a) => a.vetId === vetId);
    if (!isWithinAvailability(start, end, rules)) {
      return fail(400, 'Ese horario está fuera de la disponibilidad del veterinario.');
    }
    if (vetBusy(s.appointments, vetId, start, end)) {
      return fail(409, 'Ese horario ya está ocupado.');
    }
    const apt: Appointment = {
      id: store.id('apt'),
      vetId,
      clientId: ownerId,
      dogId,
      start,
      end,
      reason,
      status: actor.role === 'vet' || actor.role === 'admin' ? 'confirmada' : 'pendiente',
      createdAt: new Date().toISOString(),
    };
    store.patch((st) => st.appointments.push(apt));
    audit.log('APPOINTMENT_CREATE', 'appointment', apt.id, reason);
    return of(json(hydrateAppointment(store, apt), 201));
  }

  params = match(url, '/api/appointments/:id');
  if (params) {
    const apt = s.appointments.find((a) => a.id === params!['id']);
    if (!apt) {
      return fail(404, 'Cita no encontrada.');
    }
    if (!canSeeAppointment(auth, apt)) {
      return fail(403, 'No puedes ver esta cita.');
    }
    if (method === 'GET') {
      return of(json(hydrateAppointment(store, apt)));
    }
    if (method === 'PATCH') {
      if (!canMutateAppointment(auth, apt)) {
        return fail(403, 'No puedes modificar esta cita.');
      }
      const actor = auth.user()!;
      const nextStart = String(body['start'] ?? apt.start);
      const nextEnd = String(body['end'] ?? apt.end);
      const nextVet = String(body['vetId'] ?? apt.vetId);
      const nextStatus = (body['status'] as AppointmentStatus | undefined) ?? apt.status;
      if (actor.role === 'owner' && nextStatus && nextStatus !== 'cancelada' && nextStatus !== apt.status) {
        return fail(403, 'El cliente solo puede cancelar la cita.');
      }
      if (nextStatus !== 'cancelada') {
        const rules = store.state().availability.filter((a) => a.vetId === nextVet);
        if (!isWithinAvailability(nextStart, nextEnd, rules)) {
          return fail(400, 'El nuevo horario está fuera de disponibilidad.');
        }
        if (vetBusy(store.state().appointments, nextVet, nextStart, nextEnd, apt.id)) {
          return fail(409, 'Ese horario ya está ocupado.');
        }
      }
      store.patch((st) => {
        const current = st.appointments.find((a) => a.id === apt.id);
        if (!current) {
          return;
        }
        if (typeof body['reason'] === 'string') {
          current.reason = String(body['reason']);
        }
        current.start = nextStart;
        current.end = nextEnd;
        current.vetId = nextVet;
        current.status = nextStatus;
      });
      audit.log('APPOINTMENT_PATCH', 'appointment', apt.id, JSON.stringify(body));
      const updated = store.state().appointments.find((a) => a.id === apt.id)!;
      return of(json(hydrateAppointment(store, updated)));
    }
  }

  if (method === 'GET' && url === '/api/products') {
    return of(json(s.products));
  }

  if (method === 'POST' && url === '/api/products') {
    if (!auth.can(['admin'])) {
      return fail(403, 'Solo el administrador puede crear productos.');
    }
    const name = String(body['name'] ?? '').trim();
    const price = Number(body['price'] ?? 0);
    const stock = Number(body['stock'] ?? 0);
    if (!name || price < 0 || stock < 0) {
      return fail(400, 'Nombre, precio y stock son obligatorios.');
    }
    const product: Product = {
      id: store.id('prd'),
      name,
      description: String(body['description'] ?? ''),
      price,
      stock,
      image: String(body['image'] ?? 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80'),
      category: String(body['category'] ?? 'General'),
      views: 0,
      sold: Number(body['sold'] ?? 0),
      createdAt: new Date().toISOString(),
    };
    store.patch((st) => st.products.push(product));
    audit.log('PRODUCT_CREATE', 'product', product.id, product.name);
    return of(json(product, 201));
  }

  params = match(url, '/api/products/:id');
  if (params) {
    const product = s.products.find((p) => p.id === params!['id']);
    if (!product) {
      return fail(404, 'Producto no encontrado.');
    }
    if (method === 'GET') {
      store.patch((st) => {
        const p = st.products.find((x) => x.id === product.id);
        if (p) {
          p.views += 1;
        }
      });
      return of(json(store.state().products.find((p) => p.id === product.id)));
    }
    if (!auth.can(['admin'])) {
      return fail(403, 'Solo el administrador puede editar o eliminar productos.');
    }
    if (method === 'PUT') {
      store.patch((st) => {
        const i = st.products.findIndex((p) => p.id === product.id);
        if (i < 0) {
          return;
        }
        const next = { ...st.products[i] };
        if (typeof body['name'] === 'string') {
          next.name = String(body['name']);
        }
        if (typeof body['description'] === 'string') {
          next.description = String(body['description']);
        }
        if (body['price'] != null) {
          next.price = Number(body['price']);
        }
        if (body['stock'] != null) {
          next.stock = Number(body['stock']);
        }
        if (typeof body['image'] === 'string') {
          next.image = String(body['image']);
        }
        if (typeof body['category'] === 'string') {
          next.category = String(body['category']);
        }
        if (body['sold'] != null) {
          next.sold = Number(body['sold']);
        }
        st.products[i] = next;
      });
      audit.log('PRODUCT_UPDATE', 'product', product.id, product.name);
      return of(json(store.state().products.find((p) => p.id === product.id)));
    }
    if (method === 'DELETE') {
      store.patch((st) => {
        st.products = st.products.filter((p) => p.id !== product.id);
      });
      audit.log('PRODUCT_DELETE', 'product', product.id, product.name);
      return of(json({ ok: true }));
    }
  }

  if (method === 'GET' && url === '/api/admin/stats') {
    if (!auth.can(['admin'])) {
      return fail(403, 'Solo el administrador ve el dashboard.');
    }
    return of(json(buildStats(store)));
  }

  return null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function weekKey(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${pad(week)}`;
}

function buildStats(store: StoreService) {
  const s = store.state();
  const live = s.appointments.filter((a) => a.status !== 'cancelada');
  const byDay = new Map<string, number>();
  const byWeek = new Map<string, number>();
  const byMonth = new Map<string, number>();
  const byVet = new Map<string, number>();
  for (const apt of live) {
    const day = apt.start.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const wk = weekKey(apt.start);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
    const mo = monthKey(apt.start);
    byMonth.set(mo, (byMonth.get(mo) ?? 0) + 1);
    const vetName = s.users.find((u) => u.id === apt.vetId)?.fullName ?? apt.vetId;
    byVet.set(vetName, (byVet.get(vetName) ?? 0) + 1);
  }
  const usersByMonth = new Map<string, number>();
  for (const u of s.users) {
    const mo = monthKey(u.createdAt);
    usersByMonth.set(mo, (usersByMonth.get(mo) ?? 0) + 1);
  }
  const sortMap = (map: Map<string, number>) =>
    [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  return {
    appointmentsByDay: sortMap(byDay),
    appointmentsByWeek: sortMap(byWeek),
    appointmentsByMonth: sortMap(byMonth),
    appointmentsByVet: [...byVet.entries()].map(([label, value]) => ({ label, value })),
    productsByViews: [...s.products]
      .sort((a, b) => b.views - a.views)
      .slice(0, 6)
      .map((p) => ({ label: p.name, value: p.views })),
    productsBySold: [...s.products]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6)
      .map((p) => ({ label: p.name, value: p.sold })),
    newUsers: sortMap(usersByMonth),
    totals: {
      users: s.users.filter((u) => u.role === 'owner').length,
      vets: s.users.filter((u) => u.role === 'vet').length,
      appointments: live.length,
      products: s.products.length,
    },
  };
}
