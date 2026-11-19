import { Appointment, Slot, VetAvailability } from '../models';

export const DEFAULT_SLOT_MINUTES = 30;

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function activeAppointments(items: Appointment[], excludeId?: string): Appointment[] {
  return items.filter((a) => a.status !== 'cancelada' && a.id !== excludeId);
}

export function vetBusy(appointments: Appointment[], vetId: string, start: string, end: string, excludeId?: string): boolean {
  return activeAppointments(appointments, excludeId).some(
    (a) => a.vetId === vetId && overlaps(a.start, a.end, start, end),
  );
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function datePart(iso: string): string {
  return iso.slice(0, 10);
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function buildDaySlots(date: string, rules: VetAvailability[]): { start: string; end: string }[] {
  const weekday = weekdayOf(date);
  const dayRules = rules.filter((r) => r.weekday === weekday);
  const slots: { start: string; end: string }[] = [];
  for (const rule of dayRules) {
    const minutes = rule.slotMinutes || DEFAULT_SLOT_MINUTES;
    let cursor = toMinutes(rule.startTime);
    const end = toMinutes(rule.endTime);
    while (cursor + minutes <= end) {
      const startH = fromMinutes(cursor);
      const endH = fromMinutes(cursor + minutes);
      slots.push({ start: `${date}T${startH}:00`, end: `${date}T${endH}:00` });
      cursor += minutes;
    }
  }
  return slots;
}

export function decorateSlots(
  date: string,
  rules: VetAvailability[],
  appointments: Appointment[],
  vetId: string,
  excludeId?: string,
): Slot[] {
  return buildDaySlots(date, rules).map((slot) => ({
    ...slot,
    available: !vetBusy(appointments, vetId, slot.start, slot.end, excludeId),
  }));
}

export function isWithinAvailability(start: string, end: string, rules: VetAvailability[]): boolean {
  const date = datePart(start);
  return buildDaySlots(date, rules).some((slot) => slot.start === start && slot.end === end);
}

export function rangeDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${from}T00:00:00`);
  const last = new Date(`${to}T00:00:00`);
  while (cur <= last) {
    dates.push(
      `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`,
    );
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
