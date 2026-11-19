import { Injectable } from '@angular/core';
import { Dog } from '../models';

@Injectable({ providedIn: 'root' })
export class ExportService {
  csv(filename: string, rows: Record<string, unknown>[]): void {
    if (!rows.length) {
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
    this.download(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }

  json(filename: string, data: unknown): void {
    this.download(filename, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  }

  printHistory(dog: Dog, payload: unknown): void {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      return;
    }
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Historial ${dog.name}</title>
      <style>body{font-family:Georgia,serif;padding:32px;color:#1c1814}h1{font-size:28px}pre{white-space:pre-wrap;background:#f6f1e8;padding:16px;border-radius:12px}</style>
      </head><body><h1>Huella — Historial de ${dog.name}</h1><p>${dog.breed} · ${dog.birthDate}</p>
      <pre>${this.escapeHtml(JSON.stringify(payload, null, 2))}</pre>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }

  private download(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(url);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
