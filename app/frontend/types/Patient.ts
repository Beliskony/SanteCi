// ============================================================
// types/patient.types.ts
// Types frontend mappés depuis IPatient (backend)
// ============================================================

// ─── DTO retourné par l'API (sans champs sensibles) ───────────────────────────

export interface PatientDTO {
  _id: string;

  profile: {
    firstName:  string;
    lastName:   string;
    dateOfBirth: string;   // ISO 8601 — sérialisé depuis Date
    gender:     "male" | "female" | "other";
    photo?:     string;
    bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  };

  contact: {
    phone:        string;
    phoneVerified: boolean;
    email?:       string;
    emailVerified: boolean;
    emergencyContacts: Array<{
      name:         string;
      phone:        string;
      relationship: string;
    }>;
  };

  location: {
    city:      string;
    district?: string;
    address?:  string;
    coordinates?: {
      latitude:  number;
      longitude: number;
    };
  };

  health: {
    allergies:          string[];
    chronicDiseases:    string[];
    currentMedications: string[];
    disabilities?:      string[];
    height?:            number;
    weight?:            number;
    bmi?:               number;
  };

  status: {
    isVerified:     boolean;
    accountStatus:  "active" | "suspended" | "blocked";
    subscription:   "free" | "premium" | "vip";
  };

  metadata: {
    createdAt:           string;
    updatedAt:           string;
    lastMedicalUpdate:   string;
    totalConsultations:  number;
    totalPrescriptions:  number;
  };

  // Enrichi par le backend (jointure Appointment)
  nextAppointment?: {
    _id:         string;
    scheduledAt: string;  // ISO 8601
  } | null;

  // Enrichi par le backend (dernière consultation complète)
  lastConsultation?: {
    _id:   string;
    date:  string;
    title: string;
    notes: string;
  } | null;
}

// ─── Helpers dérivés (calculés côté frontend) ─────────────────────────────────

/** Âge calculé depuis dateOfBirth */
export function getAge(dateOfBirth: string): number {
  const diff = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/** Initiales depuis le profil */
export function getInitials(profile: PatientDTO["profile"]): string {
  return `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();
}

/** Statut de suivi dérivé des données patient */
export type PatientStatus = "prioritaire" | "suivi" | "recent" | "inactif";

export function deriveStatus(p: PatientDTO): PatientStatus {
  const createdAt    = new Date(p.metadata.createdAt);
  const daysSince    = (Date.now() - createdAt.getTime()) / 86_400_000;
  const hasChronic   = p.health.chronicDiseases.length > 0;
  const hasAllergy   = p.health.allergies.length > 0;
  const isInactive   = p.status.accountStatus !== "active";

  if (isInactive) return "inactif";
  if (hasChronic || hasAllergy) return "prioritaire";
  if (p.metadata.totalConsultations > 0) return "suivi";
  if (daysSince <= 30) return "recent";
  return "suivi";
}

/** Chips d'infos clés construites depuis health + status */
export interface PatientChip {
  label:   string;
  variant: "red" | "blue" | "green" | "amber";
}

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-blue-100 text-blue-700",
  "bg-pink-100 text-pink-700",
];

export function avatarColor(firstName: string, lastName: string): string {
  const idx = (firstName.charCodeAt(0) + (lastName.charCodeAt(0) ?? 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function buildChips(p: PatientDTO): PatientChip[] {
  const chips: PatientChip[] = [];

  p.health.allergies.slice(0, 2).forEach((a) =>
    chips.push({ label: `Allergie ${a}`, variant: "red" })
  );
  p.health.chronicDiseases.slice(0, 2).forEach((d) =>
    chips.push({ label: d, variant: "blue" })
  );
  if (p.health.currentMedications.length > 0)
    chips.push({ label: "Traitement actif", variant: "green" });
  if (p.status.subscription === "premium" || p.status.subscription === "vip")
    chips.push({ label: p.status.subscription, variant: "amber" });

  return chips;
}

// ─── DTO filtres ──────────────────────────────────────────────────────────────

export interface PatientFiltersDTO {
  doctorId?: string;
  search?:   string;
  status?:   PatientStatus;
  page?:     number;
  limit?:    number;
}

export interface PaginatedPatientsDTO {
  patients: PatientDTO[];
  total:    number;
  page:     number;
  pages:    number;
}

export interface PatientSummaryDTO {
  activeCount:   number;
  newThisMonth:  number;
  priorityCount: number;
}