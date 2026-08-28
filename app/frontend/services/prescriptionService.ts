// ============================================================
// services/prescriptionService.ts — Ordonnances (médecin)
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type { ApiResponse } from "@/app/frontend/types";

export interface MedicationDTO {
  name:         string;
  dosage:       string;
  frequency:    string;
  duration:     string;
  instructions?: string;
  quantity:     number;
  unit:         string;
}

export interface TestRequestedDTO {
  type:         string;
  instructions?: string;
  laboratory?:  string;
}

export interface CreatePrescriptionPayload {
  patientId:      string;
  appointmentId?: string;
  diagnosis:      string;
  medications:    MedicationDTO[];
  testsRequested?: TestRequestedDTO[];
  notes?:         string;
  validityDays?:  number;
  refillsAllowed?: number;
  followUp?: {
    required: boolean;
    date?:    string;
    notes?:   string;
  };
}

export interface Prescription {
  _id: string;
  prescriptionId: string;
  patientId: string;
  doctorId: string | {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      title?: string;
      specialty?: string;
    };
  };
  date: string; // ISODate
  validityDays: number;
  diagnosis: string;
  notes?: string;
  medications: MedicationDTO[];
  testsRequested: TestRequestedDTO[];
  status: "active" | "expired" | "completed" | "cancelled";
  isDigital: boolean;
  refillsAllowed: number;
  refillsUsed: number;
  followUp: {
    required: boolean;
    date?: string;
    notes?: string;
  };
  sharing: {
    sharedWithPharmacies: string[];
    patientAcknowledged: boolean;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    generatedBy: "doctor" | "patient" | "system";
  };
  //  Pour l'affichage dans le dashboard patient
  documentName?: string;
  documentUrl?: string;
  doctorName?: string;
}

export interface MedicationDTO {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
  unit: string;
}

export interface TestRequestedDTO {
  type: string;
  instructions?: string;
  laboratory?: string;
}

export const prescriptionService = {

  /**
   * Créer une ordonnance
   * POST /doctor/prescriptions
   */
  async create(payload: CreatePrescriptionPayload): Promise<Prescription> {
    const res = await api.post<ApiResponse<Prescription>>(
      "/doctor/prescriptions",
      payload
    );
    return res.data;
  },

};