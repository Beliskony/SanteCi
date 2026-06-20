import * as api from "@/app/frontend/lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import type { AuthUser, PatientUser, DoctorUser } from "../store/useAuthStore";
import type { ApiResponse } from "@/app/frontend/types";

// ── Types backend (ce que le serveur retourne réellement) ────
interface BackendUser {
  _id: string;          // patient : id plat
  role: "doctor" | "patient";
  isVerified?: boolean;
  accountStatus?: string;

  // ── Patient (champs plats) ──
  firstName?: string;
  lastName?: string;
  email?: string;
  photo?: string;
  groupSangin?: string;
  genre?: "male" | "female" | "other";
  health?: {
    allergies?: string[];
    chronicDiseases?: string[];
    currentMedications?: string[];
    disabilities?: string[];
    height?: number;
    weight?: number;
    bmi?: number;
  };
  postition?: {          // typo backend volontaire
    city?: string;
    district?: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
  };

  // ── Doctor (champs imbriqués) ──
  doctorId?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    title?: string;
    specialty?: string;
    photo?: string;
  };
  contact?: {
    phone?: string;
    phoneVerified?: boolean;
    email?: string;
    emailVerified?: boolean;
  };
  location?: {
    city?: string;
    district?: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  professional?: {
    licenseNumber?: string;
    licenseExpiry?: string;
    university?: string;
    graduationYear?: number;
    certifications?: any[];
  };
  telemedicine?: {
    isAvailable?: boolean;
    consultationTypes?: Array<"video" | "audio" | "chat">;
    consultationFees?: { video: number; audio: number; chat: number };
    availability?: any[];
    averageResponseTime?: number;
    rating?: number;
    totalConsultations?: number;
  };
  analytics?: {
    totalPatients?: number;
    totalConsultations?: number;
    monthlyEarnings?: number;
    patientSatisfaction?: number;
    cancellationRate?: number;
  };
  status?: {
    isVerified?: boolean;
    accountStatus?: string;
    isOnline?: boolean;
    subscription?: string;
    lastActive?: string;
  };
}

interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendUser;
}

export interface LoginPayload {
  identifiantLogin: string; // email ou téléphone
  password: string;
  role: "doctor" | "patient";
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  password: string;
  city: string;
  role: "doctor" | "patient";
  // Doctor only
  title?: "Dr" | "Pr" | "Médecin" | "Spécialiste";
  specialty?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  university?: string;
  graduationYear?: number;
  // Patient only
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
}

// ── Adaptateur backend → store ────────────────────────────────
// Le backend retourne un objet plat, le store attend PatientUser | DoctorUser
function mapToAuthUser(backendUser: BackendUser): AuthUser {

  // _id : doctor envoie _id, patient envoie id
  const id =
    typeof backendUser._id === "string" ? backendUser._id
    : typeof (backendUser._id as any)?.$oid === "string" ? (backendUser._id as any).$oid
    : backendUser._id ?? "";

  if (backendUser.role === "doctor") {
    const loc = backendUser.location;
    const pro = backendUser.professional;
    const tel = backendUser.telemedicine;

    return {
      _id: id,
      role: "doctor",
      doctorId: backendUser.doctorId ?? id,
      profile: {
        firstName:        backendUser.profile?.firstName ?? "",
        lastName:         backendUser.profile?.lastName  ?? "",
        title:            (backendUser.profile?.title as any) ?? "Dr",
        specialty:        backendUser.profile?.specialty ?? "",
        bio:              "",
        languages:        "fr",
        yearsOfExperience: 0,
        photo:            backendUser.profile?.photo,
      },
      contact: {
        phone:         backendUser.contact?.phone         ?? "",
        phoneVerified: backendUser.contact?.phoneVerified ?? false,
        email:         backendUser.contact?.email         ?? "",
        emailVerified: backendUser.contact?.emailVerified ?? false,
      },
      location: {
        city:        loc?.city        ?? "",
        district:    loc?.district,
        address:     loc?.address,
        coordinates: loc?.coordinates,
      },
      professional: {
        licenseNumber: pro?.licenseNumber ?? "",
        licenseExpiry: pro?.licenseExpiry ? new Date(pro.licenseExpiry) : new Date(),
        university:    pro?.university    ?? "",
        graduationYear: pro?.graduationYear ?? 0,
        certifications: pro?.certifications ?? [],
      },
      telemedicine: {
        isAvailable:         tel?.isAvailable         ?? false,
        consultationTypes:   tel?.consultationTypes   ?? [],
        consultationFees:    tel?.consultationFees    ?? { video: 0, audio: 0, chat: 0 },
        availability:        tel?.availability        ?? [],
        averageResponseTime: tel?.averageResponseTime ?? 0,
        rating:              tel?.rating              ?? 0,
        totalConsultations:  tel?.totalConsultations  ?? 0,
      },
      affiliations: { hospitals: [], clinics: [], insuranceCompanies: [] },
      security: { isMedcin: true, twoFactorEnabled: false, devices: [] },
      status: {
        isVerified:     backendUser.status?.isVerified     ?? false,
        accountStatus:  (backendUser.status?.accountStatus as any) ?? "active",
        subscription:   (backendUser.status?.subscription as any)  ?? "free",
        isOnline:       backendUser.status?.isOnline       ?? false,
        lastActive:     backendUser.status?.lastActive ? new Date(backendUser.status.lastActive) : new Date(),
      },
      analytics: {
        totalPatients:      backendUser.analytics?.totalPatients      ?? 0,
        totalConsultations: backendUser.analytics?.totalConsultations ?? 0,
        monthlyEarnings:    backendUser.analytics?.monthlyEarnings    ?? 0,
        patientSatisfaction: backendUser.analytics?.patientSatisfaction ?? 0,
        cancellationRate:   backendUser.analytics?.cancellationRate   ?? 0,
      },
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    } satisfies DoctorUser;
  }

  // ── Patient (inchangé) ──
  const loc = backendUser.postition;

  return {
    _id: id,
    role: "patient",
    profile: {
      firstName:   backendUser.firstName ?? "",
      lastName:    backendUser.lastName  ?? "",
      dateOfBirth: new Date(),
      gender:      backendUser.genre     ?? "other",
      bloodGroup:  backendUser.groupSangin as any,
      photo:       backendUser.photo,
    },
    contact: {
      phone: "", phoneVerified: false,
      email: backendUser.email ?? "",
      emailVerified: backendUser.isVerified ?? false,
      emergencyContacts: [],
    },
    location: {
      city:        loc?.city     ?? "",
      district:    loc?.district,
      address:     loc?.address,
      coordinates: loc?.coordinates,
    },
    health: {
      allergies:          backendUser.health?.allergies          ?? [],
      chronicDiseases:    backendUser.health?.chronicDiseases    ?? [],
      currentMedications: backendUser.health?.currentMedications ?? [],
      disabilities:       backendUser.health?.disabilities       ?? [],
      height:             backendUser.health?.height,
      weight:             backendUser.health?.weight,
      bmi:                backendUser.health?.bmi,
    },
    security:    { isPatient: true, isActive: true, failedAttempts: 0 },
    preferences: {
      language: "fr",
      notifications: { sms: false, email: true, push: true },
      privacy: { showProfile: true, showMedicalInfo: false, shareLocation: false },
    },
    status: {
      isVerified:    backendUser.isVerified ?? false,
      accountStatus: (backendUser.accountStatus as any) ?? "active",
      subscription:  "free",
    },
    metadata: {
      createdAt: new Date(), updatedAt: new Date(),
      lastMedicalUpdate: new Date(),
      totalConsultations: 0, totalPrescriptions: 0,
    },
  } satisfies PatientUser;
}

// ── Service ───────────────────────────────────────────────────
export const authService = {

  async login(payload: LoginPayload): Promise<BackendAuthResponse> {
    const { setLoading, setError, setUser } = useAuthStore.getState();
    setLoading(true);
    setError(null);
    try {
      // Route retourne { message, data: { accessToken, refreshToken, user } }
      const res = await api.post<{ message: string; data: BackendAuthResponse }>(
        "/users/login",
        payload,
        false
      );

      const { accessToken, refreshToken, user } = res.data;
      console.log("🔍 BACKEND USER BRUT:", JSON.stringify(user, null, 2));

      // Adapter l'objet plat backend → structure store
      const authUser = mapToAuthUser(user);
      setUser(authUser, accessToken, refreshToken);

      // Stocker aussi le refreshToken
      if (typeof window !== "undefined") {
        localStorage.setItem("refresh-token", refreshToken);
      }

      return res.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de connexion";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  },

  async registerPatient(payload: Omit<RegisterPayload, "role" | "title" | "specialty" | "licenseNumber" | "licenseExpiry" | "university" | "graduationYear">): Promise<{ message: string }> {
    const { setLoading, setError } = useAuthStore.getState();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ message: string }>(
        "/users/register/patient",
        payload,
        false
      );
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'inscription";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  },

  async registerDoctor(payload: Omit<RegisterPayload, "role" | "dateOfBirth" | "gender">): Promise<{ message: string }> {
    const { setLoading, setError } = useAuthStore.getState();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ message: string }>(
        "/users/register/doctor",
        payload,
        false
      );
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'inscription";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("refresh-token");
    }
    useAuthStore.getState().logout();
  },

  // POST /api/password/send-otp
  async sendOtp(email: string, role: "doctor" | "patient"): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(
      "/password/send-otp",
      { email, role },
      false
    );
    return res;
  },

  // POST /api/password/verify-otp
  async verifyOtp(email: string, otp: string, role: "doctor" | "patient"): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(
      "/password/verify-otp",
      { email, otp, role },
      false
    );
    return res;
  },

  // forgot = send-otp avec intention reset
  async forgotPassword(email: string, role: "doctor" | "patient"): Promise<{ message: string }> {
    return authService.sendOtp(email, role);
  },

  // reset = verify-otp + change-password
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
    role: "doctor" | "patient"
  ): Promise<{ message: string }> {
    // 1. Vérifier l'OTP
    await authService.verifyOtp(email, otp, role);
    // 2. Changer le mot de passe
    const res = await api.post<{ message: string }>(
      "/password/change-password",
      { email, newPassword, role },
      false
    );
    return res;
  },

  // resendOtp = alias de sendOtp
  async resendOtp(email: string, role: "doctor" | "patient"): Promise<{ message: string }> {
    return authService.sendOtp(email, role);
  },

  // Rafraîchir le profil complet depuis l'API après login
async refreshUser(): Promise<void> {
  const { user, setUser, token, refreshToken } = useAuthStore.getState();
  if (!token || !user) return;
  try {
    const endpoint = user.role === "doctor"
      ? `/doctor/${user._id}/profile`
      : `/patients/${user._id}`;
    const res = await api.get<ApiResponse<BackendUser>>(endpoint);
    const authUser = mapToAuthUser(res.data);
    setUser(authUser, token, refreshToken ?? localStorage.getItem("refresh-token") ?? "");
  } catch {
    // silencieux
  }
}
};