import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, delay, of, switchMap, throwError } from 'rxjs';
import { StoreService } from '../services/store.service';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { AuthService } from '../services/auth.service';
import { AppState, CatalogItem, Dog, Role, User } from '../models';
import { handleClinic } from '../clinic/clinic-api';

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

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  const store = inject(StoreService);
  const session = inject(SessionService);
  const audit = inject(AuditService);
  const auth = inject(AuthService);

  return of(null).pipe(
    delay(160),
    switchMap(() => handle(req, store, session, audit, auth)),
  );
};

function handle(
  req: HttpRequest<unknown>,
  store: StoreService,
  session: SessionService,
  audit: AuditService,
  auth: AuthService,
): Observable<HttpResponse<unknown>> {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();
  const body = (req.body ?? {}) as Record<string, unknown>;
  const s = store.state();

  const publicAuth =
    (method === 'POST' && (url === '/api/auth/login' || url === '/api/auth/register')) ||
    (method === 'GET' && url === '/api/public/memorials');

  if (!publicAuth) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const csrf = req.headers.get('X-CSRF-Token');
    const current = session.valid();
    if (!current || current.token !== token) {
      return fail(401, 'Sesión expirada o no autenticada.');
    }
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrf !== current.csrf) {
      return fail(403, 'Token CSRF inválido.');
    }
  }

  if (method === 'POST' && url === '/api/auth/login') {
    return new Observable((sub) => {
      auth.login(String(body['email'] ?? ''), String(body['password'] ?? '')).then((res) => {
        if (!res.ok) {
          sub.error({ status: 401, error: { message: res.message } });
          return;
        }
        const user = auth.user();
        sub.next(json({ user: publicUser(user!), session: session.valid() }));
        sub.complete();
      });
    });
  }

  if (method === 'POST' && url === '/api/auth/register') {
    return new Observable((sub) => {
      auth
        .register({
          fullName: String(body['fullName'] ?? ''),
          email: String(body['email'] ?? ''),
          password: String(body['password'] ?? ''),
          phone: String(body['phone'] ?? ''),
        })
        .then((res) => {
          if (!res.ok) {
            sub.error({ status: 400, error: { message: res.message } });
            return;
          }
          sub.next(json({ user: publicUser(auth.user()!), session: session.valid() }, 201));
          sub.complete();
        });
    });
  }

  if (method === 'POST' && url === '/api/auth/logout') {
    auth.logout();
    return of(json({ ok: true }));
  }

  if (method === 'GET' && url === '/api/auth/me') {
    return of(json({ user: publicUser(auth.user()!), session: session.valid() }));
  }

  if (method === 'GET' && url === '/api/public/memorials') {
    const items = s.dogs
      .filter((d) => d.deceased && d.publicMemorial)
      .map((d) => ({
        dog: { id: d.id, name: d.name, breed: d.breed, photos: d.photos, birthDate: d.birthDate },
        memorial: s.memorials.find((m) => m.dogId === d.id),
      }));
    return of(json(items));
  }

  if (method === 'GET' && url === '/api/users') {
    if (!auth.can(['admin'])) {
      return fail(403, 'Solo el administrador puede listar usuarios.');
    }
    return of(json(s.users.map(publicUser)));
  }

  let params = match(url, '/api/users/:id');
  if (params && method === 'PATCH') {
    if (!auth.can(['admin'])) {
      return fail(403, 'No autorizado.');
    }
    store.patch((st) => {
      const u = st.users.find((x) => x.id === params!['id']);
      if (!u) {
        return;
      }
      if (typeof body['status'] === 'string') {
        u.status = body['status'] as User['status'];
      }
      if (typeof body['role'] === 'string') {
        u.role = body['role'] as Role;
      }
    });
    audit.log('USER_PATCH', 'user', params['id'], JSON.stringify(body));
    return of(json({ ok: true }));
  }

  if (method === 'GET' && url === '/api/profile') {
    return of(json(publicUser(auth.user()!)));
  }

  if (method === 'PUT' && url === '/api/profile') {
    store.patch((st) => {
      const u = st.users.find((x) => x.id === session.userId());
      if (!u) {
        return;
      }
      u.fullName = String(body['fullName'] ?? u.fullName);
      u.phone = String(body['phone'] ?? u.phone);
      if (body['address'] && typeof body['address'] === 'object') {
        u.address = { ...u.address, ...(body['address'] as User['address']) };
      }
    });
    audit.log('PROFILE_UPDATE', 'user', session.userId()!, 'Actualización de perfil');
    return of(json(publicUser(auth.user()!)));
  }

  if (method === 'GET' && url === '/api/dogs') {
    const dogs = visibleDogs(s, auth);
    return of(json(dogs));
  }

  if (method === 'POST' && url === '/api/dogs') {
    if (!auth.can(['owner', 'admin'])) {
      return fail(403, 'No puedes registrar perros.');
    }
    const dog = createDog(store, auth.user()!, body);
    audit.log('DOG_CREATE', 'dog', dog.id, dog.name);
    return of(json(dog, 201));
  }

  params = match(url, '/api/dogs/:id');
  if (params) {
    const dog = s.dogs.find((d) => d.id === params!['id']);
    if (!dog) {
      return fail(404, 'Perro no encontrado.');
    }
    if (!auth.canAccessDog(dog)) {
      return fail(403, 'No tienes acceso a este expediente.');
    }
    if (method === 'GET') {
      return of(json(hydrateDog(s, dog)));
    }
    if (method === 'PUT') {
      store.patch((st) => {
        const i = st.dogs.findIndex((d) => d.id === dog.id);
        st.dogs[i] = { ...st.dogs[i], ...sanitizeDog(body) };
      });
      audit.log('DOG_UPDATE', 'dog', dog.id, dog.name);
      return of(json(store.state().dogs.find((d) => d.id === dog.id)));
    }
    if (method === 'DELETE') {
      store.patch((st) => {
        st.dogs = st.dogs.filter((d) => d.id !== dog.id);
      });
      audit.log('DOG_DELETE', 'dog', dog.id, dog.name);
      return of(json({ ok: true }));
    }
  }

  params = match(url, '/api/dogs/:id/:collection');
  if (params) {
    return collectionCrud(req, params, store, auth, audit, method, body);
  }

  params = match(url, '/api/:collection/:id');
  if (params && ['PUT', 'DELETE'].includes(method)) {
      return itemMutation(params['collection'], params['id'], method, body, store, audit);
  }

  if (method === 'GET' && url === '/api/catalogs') {
    if (!auth.can(['admin', 'vet', 'owner'])) {
      return fail(403, 'No autorizado.');
    }
    return of(json(s.catalogs));
  }

  if (method === 'POST' && url === '/api/catalogs') {
    if (!auth.can(['admin'])) {
      return fail(403, 'Solo admin.');
    }
    const item: CatalogItem = {
      id: store.id('cat'),
      type: body['type'] as CatalogItem['type'],
      name: String(body['name'] ?? ''),
      extra: String(body['extra'] ?? ''),
    };
    store.patch((st) => st.catalogs.push(item));
    audit.log('CATALOG_CREATE', 'catalog', item.id, item.name);
    return of(json(item, 201));
  }

  if (method === 'GET' && url === '/api/audit') {
    if (!auth.can(['admin'])) {
      return fail(403, 'Solo admin.');
    }
    return of(json(s.audit));
  }

  const clinic = handleClinic(req, store, session, audit, auth);
  if (clinic) {
    return clinic;
  }

  if (method === 'GET' && url === '/api/alerts') {
    const dogs = visibleDogs(s, auth).map((d) => d.id);
    const today = new Date().toISOString().slice(0, 10);
    const alerts = s.vaccines
      .filter((v) => dogs.includes(v.dogId))
      .filter((v) => v.status !== 'aplicada')
      .map((v) => ({
        ...v,
        dogName: s.dogs.find((d) => d.id === v.dogId)?.name,
        overdue: v.scheduledDate < today,
      }));
    return of(json(alerts));
  }

  return fail(404, `Recurso no implementado: ${method} ${url}`);
}

function publicUser(user: User) {
  const { passwordHash, passwordSalt, failedAttempts, lockedUntil, ...safe } = user;
  return safe;
}

function visibleDogs(s: AppState, auth: AuthService): Dog[] {
  return s.dogs.filter((d) => auth.canAccessDog(d));
}

function hydrateDog(s: AppState, dog: Dog) {
  return {
    dog,
    vaccines: s.vaccines.filter((x) => x.dogId === dog.id),
    medical: s.medical.filter((x) => x.dogId === dog.id),
    feedingPlans: s.feedingPlans.filter((x) => x.dogId === dog.id),
    meals: s.meals.filter((x) => x.dogId === dog.id),
    weights: s.weights.filter((x) => x.dogId === dog.id),
    exercises: s.exercises.filter((x) => x.dogId === dog.id),
    goals: s.goals.filter((x) => x.dogId === dog.id),
    preferences: s.preferences.filter((x) => x.dogId === dog.id),
    wardrobe: s.wardrobe.filter((x) => x.dogId === dog.id),
    moments: s.moments.filter((x) => x.dogId === dog.id),
    insurances: s.insurances.filter((x) => x.dogId === dog.id),
    payments: s.payments.filter((p) => s.insurances.some((i) => i.id === p.insuranceId && i.dogId === dog.id)),
    claims: s.claims.filter((c) => s.insurances.some((i) => i.id === c.insuranceId && i.dogId === dog.id)),
    memorial: s.memorials.find((m) => m.dogId === dog.id) ?? null,
    owner: publicUser(s.users.find((u) => u.id === dog.ownerId)!),
  };
}

function sanitizeDog(body: Record<string, unknown>): Partial<Dog> {
  const allowed: (keyof Dog)[] = [
    'name',
    'breed',
    'sex',
    'birthDate',
    'birthPlace',
    'origin',
    'photos',
    'allergies',
    'favoriteFood',
    'restrictions',
    'publicMemorial',
    'deceased',
    'baptism',
    'mother',
    'father',
    'assignedVetId',
  ];
  const next: Partial<Dog> = {};
  for (const key of allowed) {
    if (key in body) {
      (next as Record<string, unknown>)[key] = body[key];
    }
  }
  return next;
}

function createDog(store: StoreService, user: User, body: Record<string, unknown>): Dog {
  const dog: Dog = {
    id: store.id('dog'),
    ownerId: user.role === 'owner' ? user.id : String(body['ownerId'] ?? user.id),
    assignedVetId: String(body['assignedVetId'] ?? 'usr-vet'),
    name: String(body['name'] ?? 'Sin nombre'),
    breed: String(body['breed'] ?? ''),
    sex: (body['sex'] as Dog['sex']) ?? 'hembra',
    birthDate: String(body['birthDate'] ?? new Date().toISOString().slice(0, 10)),
    birthPlace: String(body['birthPlace'] ?? ''),
    origin: String(body['origin'] ?? ''),
    photos: (body['photos'] as string[]) ?? [
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80',
    ],
    allergies: [],
    restrictions: [],
    publicMemorial: false,
    deceased: false,
    createdAt: new Date().toISOString(),
  };
  store.patch((st) => st.dogs.push(dog));
  return dog;
}

function collectionCrud(
  _req: HttpRequest<unknown>,
  params: Record<string, string>,
  store: StoreService,
  auth: AuthService,
  audit: AuditService,
  method: string,
  body: Record<string, unknown>,
): Observable<HttpResponse<unknown>> {
  const s = store.state();
  const dog = s.dogs.find((d) => d.id === params['id']);
  if (!dog) {
    return fail(404, 'Perro no encontrado.');
  }
  if (!auth.canAccessDog(dog)) {
    return fail(403, 'Sin acceso.');
  }
  const key = params['collection'] as keyof AppState;
  const map: Record<string, keyof AppState> = {
    vaccines: 'vaccines',
    medical: 'medical',
    feeding: 'feedingPlans',
    meals: 'meals',
    weights: 'weights',
    exercises: 'exercises',
    goals: 'goals',
    preferences: 'preferences',
    wardrobe: 'wardrobe',
    moments: 'moments',
    insurance: 'insurances',
    memorial: 'memorials',
  };
  const collection = map[params['collection']];
  if (!collection) {
    if (params['collection'] === 'export' && method === 'GET') {
      return of(json(hydrateDog(s, dog)));
    }
    return fail(404, 'Colección inválida.');
  }
  if (method === 'GET') {
    if (collection === 'memorials') {
      return of(json(s.memorials.find((m) => m.dogId === dog.id) ?? null));
    }
    const list = (s[collection] as { dogId?: string }[]).filter((x) => x.dogId === dog.id);
    return of(json(list));
  }
  if (method === 'POST') {
    if (collection === 'vaccines' || collection === 'medical') {
      if (!auth.canWriteHealth(dog)) {
        return fail(403, 'No puedes editar salud.');
      }
    }
    if (collection === 'memorials') {
      const memorial = { dogId: dog.id, ...body };
      store.patch((st) => {
        st.memorials = st.memorials.filter((m) => m.dogId !== dog.id);
        st.memorials.push(memorial as AppState['memorials'][number]);
        const d = st.dogs.find((x) => x.id === dog.id);
        if (d) {
          d.deceased = true;
        }
      });
      audit.log('MEMORIAL_UPSERT', 'dog', dog.id, 'Etapa final');
      return of(json(memorial, 201));
    }
    const item = { id: store.id(key.slice(0, 3)), dogId: dog.id, ...body };
    store.patch((st) => {
      (st[collection] as unknown[]).push(item);
    });
    audit.log('CREATE', String(collection), String((item as { id: string }).id), dog.name);
    return of(json(item, 201));
  }
  return fail(405, 'Método no permitido.');
}

function itemMutation(
  collection: string,
  id: string,
  method: string,
  body: Record<string, unknown>,
  store: StoreService,
  audit: AuditService,
): Observable<HttpResponse<unknown>> {
  const map: Record<string, keyof AppState> = {
    vaccines: 'vaccines',
    medical: 'medical',
    feeding: 'feedingPlans',
    meals: 'meals',
    weights: 'weights',
    exercises: 'exercises',
    goals: 'goals',
    preferences: 'preferences',
    wardrobe: 'wardrobe',
    moments: 'moments',
    insurances: 'insurances',
    payments: 'payments',
    claims: 'claims',
    catalogs: 'catalogs',
  };
  const key = map[collection];
  if (!key) {
    return fail(404, 'Colección inválida.');
  }
  if (method === 'DELETE') {
    store.patch((st) => {
      (st as unknown as Record<string, { id: string }[]>)[key] = (
        st[key] as { id: string }[]
      ).filter((x) => x.id !== id);
    });
    audit.log('DELETE', collection, id, 'Eliminación');
    return of(json({ ok: true }));
  }
  store.patch((st) => {
    const list = st[key] as { id: string }[];
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) {
      list[i] = { ...list[i], ...body };
    }
  });
  audit.log('UPDATE', collection, id, 'Actualización');
  return of(json({ ok: true }));
}
