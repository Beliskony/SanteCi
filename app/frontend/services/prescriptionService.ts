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
  doctorId: string;
  patientId: string;
  appointmentId?: string;
  date: string;
  validityDays: number;
  diagnosis: string;
  medications: MedicationDTO[];
  testsRequested: TestRequestedDTO[];
  notes?: string;
  refillsAllowed: number;
  refillsUsed: number;
  status: "active" | "expired" | "completed" | "cancelled";
  followUp: { required: boolean; date?: string; notes?: string };
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