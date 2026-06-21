export type PatientFollowUpStatus = "priority" | "followed" | "recent" | null;

export interface PatientListItem {
  _id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  age: number;
  mainCondition: string;     // ex: "Hypertension légère"
  followUpStatus: PatientFollowUpStatus;
  nextAppointment?: {
    date: string;             // ISO
    label: string;            // "Aujourd'hui 14:30", "Demain 09:00"...
  };
  bloodGroup?: string;
  patientSince?: string;      // année ou date d'inscription
  keyInfo?: string[];         // ["Allergie pénicilline", "HTA légère", "Traitement actif"]
  lastConsultation?: {
    title: string;
    notes: string;
  };
}