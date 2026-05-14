export type { IHospitalClinic } from "@/app/server/interfaces/hopitalClinic.interface";
import type { IHospitalClinic } from "@/app/server/interfaces/hopitalClinic.interface";

export type FacilityLocation    = IHospitalClinic["location"];
export type FacilityContact     = IHospitalClinic["contact"];
export type FacilityService     = IHospitalClinic["services"][number];
export type FacilityStaff       = IHospitalClinic["staff"];
export type FacilityEquipment   = IHospitalClinic["facilities"];
export type FacilityPartnerships = IHospitalClinic["partnerships"];
export type FacilityHours       = IHospitalClinic["hours"];
export type FacilityCertification = IHospitalClinic["certification"];
export type FacilityMetadata    = IHospitalClinic["metadata"];

// ─── Types propres au frontend ────────────────────────────────

export interface HospitalFilters {
  city?: string;
  district?: string;
  type?: IHospitalClinic["type"];
  category?: IHospitalClinic["category"];
  telemedicineEnabled?: boolean;
  homeVisits?: boolean;
  emergency24h?: boolean;
  specialty?: string;
  page?: number;
  limit?: number;
}

// Format exact retourné par search() du backend
export interface HospitalSearchResponse {
  facilities: IHospitalClinic[];
  total: number;
  page: number;
  pages: number;
}

// Payload création
export type CreateHospitalPayload = Omit<
  IHospitalClinic,
  "_id" | "facilityId" | "metadata" | "staff"
> & {
  staff: Omit<FacilityStaff, "doctors">;
};

// Payload mise à jour (tous champs optionnels)
export interface UpdateHospitalPayload {
  name?: string;
  type?: IHospitalClinic["type"];
  category?: IHospitalClinic["category"];
  location?: Partial<FacilityLocation>;
  contact?: Partial<FacilityContact>;
  services?: IHospitalClinic["services"];
  facilities?: Partial<FacilityEquipment>;
  partnerships?: Partial<FacilityPartnerships>;
  hours?: Partial<FacilityHours>;
  certification?: Partial<FacilityCertification>;
}