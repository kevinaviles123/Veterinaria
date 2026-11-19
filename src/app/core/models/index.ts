export type Role = 'admin' | 'owner' | 'vet' | 'guest';

export type DogStage = 'puppy' | 'adult' | 'senior' | 'memorial';
export type Sex = 'hembra' | 'macho';
export type RecordStatus = 'activo' | 'inactivo' | 'bloqueado';
export type VaccineStatus = 'programada' | 'aplicada' | 'vencida';
export type InsuranceStatus = 'vigente' | 'por_vencer' | 'vencida' | 'cancelada';
export type ClaimStatus = 'abierto' | 'en_revision' | 'cerrado' | 'rechazado';

export interface Address {
  line1: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
}

export interface UserDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string;
  address: Address;
  documents: UserDocument[];
  status: RecordStatus;
  passwordHash: string;
  passwordSalt: string;
  failedAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  vetClinic?: string;
  licenseNumber?: string;
}

export interface Session {
  token: string;
  userId: string;
  role: Role;
  issuedAt: number;
  expiresAt: number;
  csrf: string;
}

export interface ParentInfo {
  name: string;
  breed: string;
  notes?: string;
}

export interface Baptism {
  date: string;
  assignedName: string;
  notes: string;
  photos: string[];
}

export interface Dog {
  id: string;
  ownerId: string;
  assignedVetId?: string;
  name: string;
  breed: string;
  sex: Sex;
  birthDate: string;
  birthPlace: string;
  origin: string;
  photos: string[];
  mother?: ParentInfo;
  father?: ParentInfo;
  baptism?: Baptism;
  allergies: string[];
  favoriteFood?: string;
  restrictions: string[];
  publicMemorial: boolean;
  deceased: boolean;
  createdAt: string;
}

export interface Vaccine {
  id: string;
  dogId: string;
  type: string;
  scheduledDate: string;
  appliedDate?: string;
  veterinarian: string;
  lot: string;
  notes: string;
  status: VaccineStatus;
}

export interface MedicalRecord {
  id: string;
  dogId: string;
  date: string;
  veterinarian: string;
  diagnosis: string;
  medications: string;
  notes: string;
}

export interface FeedingPlan {
  id: string;
  dogId: string;
  stage: Exclude<DogStage, 'memorial'>;
  description: string;
  kcalPerDay: number;
  mealsPerDay: number;
}

export interface MealLog {
  id: string;
  dogId: string;
  date: string;
  time: string;
  type: string;
  brand: string;
  portionGrams: number;
}

export interface WeightLog {
  id: string;
  dogId: string;
  date: string;
  kg: number;
}

export interface ExerciseLog {
  id: string;
  dogId: string;
  date: string;
  type: string;
  minutes: number;
  intensity: 'baja' | 'media' | 'alta';
}

export interface Goal {
  id: string;
  dogId: string;
  title: string;
  period: 'semana' | 'mes';
  target: string;
  progress: number;
}

export interface Preference {
  id: string;
  dogId: string;
  category: 'gusto' | 'juguete' | 'actividad' | 'premio';
  name: string;
  notes: string;
}

export interface WardrobeItem {
  id: string;
  dogId: string;
  kind: 'ropa' | 'accesorio';
  name: string;
  type: string;
  size: string;
  color: string;
  photo: string;
  favorite: boolean;
}

export interface Moment {
  id: string;
  dogId: string;
  date: string;
  comment: string;
  photo: string;
  people: string;
}

export interface Insurance {
  id: string;
  dogId: string;
  insurer: string;
  policyNumber: string;
  startDate: string;
  endDate: string;
  value: number;
  beneficiaries: string;
  conditions: string;
  status: InsuranceStatus;
}

export interface InsurancePayment {
  id: string;
  insuranceId: string;
  date: string;
  amount: number;
  method: string;
}

export interface InsuranceClaim {
  id: string;
  insuranceId: string;
  date: string;
  event: string;
  status: ClaimStatus;
  notes: string;
}

export interface Memorial {
  dogId: string;
  deathDate: string;
  cause?: string;
  notes: string;
  cemetery: string;
  locationRef: string;
  lat?: number;
  lng?: number;
  contact: string;
  tribute: string;
}

export interface CatalogItem {
  id: string;
  type: 'raza' | 'vacuna' | 'alimento' | 'aseguradora';
  name: string;
  extra?: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada';

export interface VetAvailability {
  id: string;
  vetId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

export interface Appointment {
  id: string;
  vetId: string;
  clientId: string;
  dogId: string;
  start: string;
  end: string;
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  views: number;
  sold: number;
  createdAt: string;
}

export interface Slot {
  start: string;
  end: string;
  available: boolean;
}

export interface AppState {
  users: User[];
  dogs: Dog[];
  vaccines: Vaccine[];
  medical: MedicalRecord[];
  feedingPlans: FeedingPlan[];
  meals: MealLog[];
  weights: WeightLog[];
  exercises: ExerciseLog[];
  goals: Goal[];
  preferences: Preference[];
  wardrobe: WardrobeItem[];
  moments: Moment[];
  insurances: Insurance[];
  payments: InsurancePayment[];
  claims: InsuranceClaim[];
  memorials: Memorial[];
  catalogs: CatalogItem[];
  audit: AuditEvent[];
  availability: VetAvailability[];
  appointments: Appointment[];
  products: Product[];
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  owner: 'Cliente',
  vet: 'Veterinario',
  guest: 'Invitado',
};

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};
