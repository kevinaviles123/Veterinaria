import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Appointment,
  CatalogItem,
  Dog,
  Product,
  Slot,
  User,
  VetAvailability,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<{ user: User }>('/api/auth/login', { email, password });
  }

  register(payload: { fullName: string; email: string; password: string; phone: string }) {
    return this.http.post('/api/auth/register', payload);
  }

  logout() {
    return this.http.post('/api/auth/logout', {});
  }

  profile() {
    return this.http.get<User>('/api/profile');
  }

  saveProfile(payload: Partial<User>) {
    return this.http.put<User>('/api/profile', payload);
  }

  dogs() {
    return this.http.get<Dog[]>('/api/dogs');
  }

  dog(id: string) {
    return this.http.get<Record<string, unknown>>(`/api/dogs/${id}`);
  }

  createDog(payload: Partial<Dog>) {
    return this.http.post<Dog>('/api/dogs', payload);
  }

  updateDog(id: string, payload: Partial<Dog>) {
    return this.http.put<Dog>(`/api/dogs/${id}`, payload);
  }

  collection<T>(dogId: string, name: string) {
    return this.http.get<T[]>(`/api/dogs/${dogId}/${name}`);
  }

  add<T>(dogId: string, name: string, payload: unknown) {
    return this.http.post<T>(`/api/dogs/${dogId}/${name}`, payload);
  }

  patch<T>(collection: string, id: string, payload: unknown) {
    return this.http.put<T>(`/api/${collection}/${id}`, payload);
  }

  remove(collection: string, id: string) {
    return this.http.delete(`/api/${collection}/${id}`);
  }

  users() {
    return this.http.get<User[]>('/api/users');
  }

  patchUser(id: string, payload: Partial<User>) {
    return this.http.patch(`/api/users/${id}`, payload);
  }

  catalogs() {
    return this.http.get<CatalogItem[]>('/api/catalogs');
  }

  addCatalog(payload: Partial<CatalogItem>) {
    return this.http.post<CatalogItem>('/api/catalogs', payload);
  }

  audit() {
    return this.http.get('/api/audit');
  }

  alerts() {
    return this.http.get<Array<{ id: string; type: string; scheduledDate: string; status: string; dogName?: string; overdue: boolean }>>(
      '/api/alerts',
    );
  }

  publicMemorials() {
    return this.http.get('/api/public/memorials');
  }

  createUser(payload: Partial<User> & { password: string }) {
    return this.http.post<User>('/api/users', payload);
  }

  vets() {
    return this.http.get<User[]>('/api/vets');
  }

  availability(vetId: string) {
    return this.http.get<VetAvailability[]>(`/api/vets/${vetId}/availability`);
  }

  saveAvailability(vetId: string, items: Array<Omit<VetAvailability, 'id' | 'vetId'> & { id?: string }>) {
    return this.http.put<VetAvailability[]>(`/api/vets/${vetId}/availability`, { items });
  }

  slots(vetId: string, from: string, to: string) {
    return this.http.get<Slot[]>(`/api/vets/${vetId}/slots`, { params: { from, to } });
  }

  appointments() {
    return this.http.get<Appointment[]>('/api/appointments');
  }

  appointment(id: string) {
    return this.http.get<Appointment>(`/api/appointments/${id}`);
  }

  createAppointment(payload: Partial<Appointment>) {
    return this.http.post<Appointment>('/api/appointments', payload);
  }

  patchAppointment(id: string, payload: Partial<Appointment>) {
    return this.http.patch<Appointment>(`/api/appointments/${id}`, payload);
  }

  products() {
    return this.http.get<Product[]>('/api/products');
  }

  product(id: string) {
    return this.http.get<Product>(`/api/products/${id}`);
  }

  createProduct(payload: Partial<Product>) {
    return this.http.post<Product>('/api/products', payload);
  }

  updateProduct(id: string, payload: Partial<Product>) {
    return this.http.put<Product>(`/api/products/${id}`, payload);
  }

  deleteProduct(id: string) {
    return this.http.delete(`/api/products/${id}`);
  }

  adminStats() {
    return this.http.get<{
      appointmentsByDay: Array<{ label: string; value: number }>;
      appointmentsByWeek: Array<{ label: string; value: number }>;
      appointmentsByMonth: Array<{ label: string; value: number }>;
      appointmentsByVet: Array<{ label: string; value: number }>;
      productsByViews: Array<{ label: string; value: number }>;
      productsBySold: Array<{ label: string; value: number }>;
      newUsers: Array<{ label: string; value: number }>;
      totals: { users: number; vets: number; appointments: number; products: number };
    }>('/api/admin/stats');
  }
}
