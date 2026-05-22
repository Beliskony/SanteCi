import * as api from "@/app/frontend/lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import type { AuthUser, PatientUser, DoctorUser } from "../store/useAuthStore";
import type { ApiResponse } from "@/app/frontend/types";

// ── Types backend (ce que le serveur retourne réellement) ────
interface BackendUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "doctor" | "patient";
  isVerified: boolean;
  accountStatus?: string;
  photo?: string;        // ← Ajouté
  title?: string;        // ← Ajouté pour doctor
  specialty?: string;    // ← Ajouté pour doctor
  profile?: {            // ← Au cas où le backend retourne aussi profile
    photo?: string;
    title?: string;
    specialty?: string;
}
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

  const photoUrl = backendUser.photo || backendUser.profile?.photo;

  if (backendUser.role === "doctor") {
    return {
      _id: backendUser.id as unknown as any,
      role: "doctor",
      doctorId: backendUser.id,
      profile: {
        firstName: backendUser.firstName,
        lastName: backendUser.lastName,
        title: "Dr",
        specialty: "",
        bio: "",
        languages: "fr",
        yearsOfExperience: 0,
        photo: photoUrl,
      },
      contact: {
        phone: "",
        phoneVerified: false,
        email: backendUser.email,
        emailVerified: backendUser.isVerified,
      },
      location: { city: "" },
      professional: {
        licenseNumber: "",
        licenseExpiry: new Date(),
        university: "",
        graduationYear: 0,
        certifications: [],
      },
      telemedicine: {
        isAvailable: false,
        consultationTypes: [],
        consultationFees: { video: 0, audio: 0, chat: 0 },
        availability: [],
        averageResponseTime: 0,
        rating: 0,
        totalConsultations: 0,
      },
      affiliations: { hospitals: [], clinics: [], insuranceCompanies: [] },
      security: { isMedcin: true, twoFactorEnabled: false, devices: [] },
      status: {
        isVerified: backendUser.isVerified,
        accountStatus: (backendUser.accountStatus as any) ?? "active",
        subscription: "free",
        isOnline: true,
        lastActive: new Date(),
      },
      analytics: {
        totalPatients: 0,
        totalConsultations: 0,
        monthlyEarnings: 0,
        patientSatisfaction: 0,
        cancellationRate: 0,
      },
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    } satisfies DoctorUser;
  }

  return {
    _id: backendUser.id as any,
    role: "patient",
    profile: {
      firstName: backendUser.firstName,
      lastName: backendUser.lastName,
      dateOfBirth: new Date(),
      gender: "other",
      photo: photoUrl,
    },
    contact: {
      phone: "",
      phoneVerified: false,
      email: backendUser.email,
      emailVerified: backendUser.isVerified,
      emergencyContacts: [],
    },
    location: { city: "" },
    health: {
      allergies: [],
      chronicDiseases: [],
      currentMedications: [],
    },
    security: {
      isPatient: true,
      isActive: true,
      failedAttempts: 0,
    },
    preferences: {
      language: "fr",
      notifications: { sms: false, email: true, push: true },
      privacy: { showProfile: true, showMedicalInfo: false, shareLocation: false },
    },
    status: {
      isVerified: backendUser.isVerified,
      accountStatus: (backendUser.accountStatus as any) ?? "active",
      subscription: "free",
    },
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMedicalUpdate: new Date(),
      totalConsultations: 0,
      totalPrescriptions: 0,
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