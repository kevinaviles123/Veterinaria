import { Injectable } from '@angular/core';
import { StoreService } from './store.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(
    private readonly store: StoreService,
    private readonly session: SessionService,
  ) {}

  log(action: string, entity: string, entityId: string, details: string): void {
    const userId = this.session.userId();
    const actor = this.store.state().users.find((u) => u.id === userId);
    this.store.patch((s) => {
      s.audit.unshift({
        id: this.store.id('aud'),
        at: new Date().toISOString(),
        actorId: actor?.id ?? 'system',
        actorName: actor?.fullName ?? 'Sistema',
        action,
        entity,
        entityId,
        details,
      });
      s.audit = s.audit.slice(0, 300);
    });
  }
}
