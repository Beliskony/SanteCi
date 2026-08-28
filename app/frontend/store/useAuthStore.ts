import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

// ─────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────

type AccountStatus = "active" | "suspended" | "blocked";
type Subscription = "free" | "premium";

export interface BaseProfile {
  firstName: string;
  lastName: string;
  photo?: string;
}

export interface BaseContact {
  phone: string;
  phoneVerified: boolean;
  email?: string;
  emailVerified: boolean;
}

export interface BaseLocation {
  city: string;
  district?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface BaseStatus {
  isVerified: boolean;
  accountStatus: AccountStatus;
  subscription: Subscription | "elite" | "vip";
  subscriptionExpiry?: Date;
}

// ─────────────────────────────────────────────
// Patient-specific types
// ─────────────────────────────────────────────

export interface PatientProfile extends BaseProfile {
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  photo?: string;
}

export interface PatientContact extends BaseContact {
  emergencyContacts: Array<{
    _id: string;
    name: string;
    phone: string;
    relationship: string;
  }>;
}

export interface PatientHealth {
  allergies: string[];
  chronicDiseases: string[];
  currentMedications: string[];
  disabilities?: string[];
  bloodPressure?: string;
  height?: number;
  weight?: number;
  bmi?: number;
}

export interface DoctorPreferences {
  privacy: {
    showProfile: boolean;
    showLocation: boolean;
    showBio: boolean;
  };
}

export interface PatientSecurity {
  isPatient: true;
  isActive: boolean;
  lastLogin?: Date;
  failedAttempts: number;
  lockUntil?: Date;
}

export interface PatientPreferences {
  language: "fr" | "en";
  notifications: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
  privacy: {
    showProfile: boolean;
    showMedicalInfo: boolean;
    shareLocation: boolean;
  };
}

export interface PatientMetadata {
  createdAt: Date;
  updatedAt: Date;
  lastMedicalUpdate: Date;
  totalConsultations: number;
  totalPrescriptions: number;
}

export interface PatientUser {
  _id: string;
  role: "patient";
  profile: PatientProfile;
  contact: PatientContact;
  location: BaseLocation;
  health: PatientHealth;
  security: PatientSecurity;
  preferences: PatientPreferences;
  status: BaseStatus & { verificationCode?: string; verificationExpires?: Date };
  metadata: PatientMetadata;
}

// ─────────────────────────────────────────────
// Doctor-specific types
// ─────────────────────────────────────────────

export interface DoctorProfile extends BaseProfile {
  title: "Dr" | "Pr" | "Médecin" | "Spécialiste";
  photo?: string;
  specialty: string;
  bio?: string;
  languages?: Array<'fr' | 'en'>;
  yearsOfExperience?: number;
}

export interface DoctorContact extends BaseContact {
  emergencyContact?: string;
}

export interface DoctorProfessional {
  licenseNumber: string;
  licenseExpiry: Date;
  university: string;
  graduationYear: number;
  certifications: Array<{
    _id: string;
    name: string;
    year: number;
    issuer: string;
    documentUrl?: string;
  }>;
}

export interface DoctorTelemedicine {
  isAvailable: boolean;
  consultationTypes: Array<"video" | "audio" | "chat">;
  consultationFees: {
    video: number;
    audio: number;
    chat: number;
  };
  availability: Array<{
    day: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";
    slots: Array<{
      start: string;
      end: string;
      isBooked: boolean;
    }>;
  }>;
  averageResponseTime: number;
  rating: number;
  totalConsultations: number;
}

export interface DoctorAffiliations {
  hospitals: string[];
  clinics: string[];
  insuranceCompanies: string[];
}

export interface DoctorAnalytics {
  totalPatients: number;
  totalConsultations: number;
  monthlyEarnings: number;
  patientSatisfaction: number;
  cancellationRate: number;
}

export interface DoctorSecurity {
  isMedcin: true;
  username?: string;
  twoFactorEnabled: boolean;
  devices: Array<{
    deviceId: string;
    platform: "ios" | "android" | "web";
    lastActive: Date;
  }>;
}

export interface DoctorMetadata {
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorUser {
  _id: string;
  role: "doctor";
  doctorId: string;
  profile: DoctorProfile;
  contact: DoctorContact;
  location: BaseLocation & { consultationRadius?: number };
  professional: DoctorProfessional;
  telemedicine: DoctorTelemedicine;
  affiliations: DoctorAffiliations;
  preferences: DoctorPreferences;
  security: DoctorSecurity;
  status: BaseStatus & { isOnline: boolean; lastActive: Date };
  analytics: DoctorAnalytics;
  metadata: DoctorMetadata;
}

// ─────────────────────────────────────────────
// Union type
// ─────────────────────────────────────────────

export type AuthUser = PatientUser | DoctorUser;

// ─────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────

export const isPatient = (user: AuthUser): user is PatientUser =>
  user.role === "patient";

export const isDoctor = (user: AuthUser): user is DoctorUser =>
  user.role === "doctor";

// ─────────────────────────────────────────────
// Store state & actions
// ─────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null   // ← nouveau
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean; // pour vérifier que le store a été rechargé depuis le localStorage
  setHasHydrated: (hydrated: boolean) => void; // action pour mettre à jour _hasHydrated

  updateProfilePhoto: (photoUrl: string) => void;

  // Actions
  setUser: (user: AuthUser, token: string, refreshToken: string) => void;
  setTokens: (token: string, refreshToken: string) => void;  // ← nouveau
  updatePatientProfile: (profile: Partial<PatientProfile>) => void;
  updateDoctorProfile: (profile: Partial<DoctorProfile>) => void;
  updateLocation: (location: Partial<BaseLocation>) => void;
  

  // Doctor only
  setOnlineStatus: (isOnline: boolean) => void;
  updateTelemedicine: (data: Partial<DoctorTelemedicine>) => void;
  updateDoctorProfessional: (data: Partial<DoctorProfessional>) => void;
  updateDoctorStatus: (data: Partial<BaseStatus & { isOnline: boolean }>) => void;
  updateDoctorPreferences: (prefs: Partial<DoctorPreferences>) => void;

  // Patient only
  updateHealth: (health: Partial<PatientHealth>) => void;
  updatePreferences: (prefs: Partial<PatientPreferences>) => void;

  // Auth
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
    // ── Mot de passe oublié ──────────────────────────────────
  forgotPassword: (email: string, role: "doctor" | "patient") => Promise<void>;
  verifyOtp: (email: string, otp: string, role: "doctor" | "patient") => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string, role: "doctor" | "patient") => Promise<void>;
  resendOtp: (email: string, role: "doctor" | "patient") => Promise<void>;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        _hasHydrated: false,
        setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
        // Appelé après login — stocke user + les deux tokens
        setUser: (user, token, refreshToken) =>
          set({ user, token, refreshToken, isAuthenticated: true, error: null }),

        // Appelé après refresh — met à jour les tokens sans toucher au user
        setTokens: (token, refreshToken) =>
          set({ token, refreshToken }),

        updatePatientProfile: (profile) => {
          const { user } = get();
          if (!user || !isPatient(user)) return;
          set({ user: { ...user, profile: { ...user.profile, ...profile } } });
        },

        updateDoctorProfile: (profile) => {
          const { user } = get();
          if (!user || !isDoctor(user)) return;
          set({ user: { ...user, profile: { ...user.profile, ...profile } } });
        },

        updateLocation: (location) => {
          const { user } = get();
          if (!user) return;
          set({ user: { ...user, location: { ...user.location, ...location } } });
        },

        setOnlineStatus: (isOnline) => {
          const { user } = get();
          if (!user || !isDoctor(user)) return;
          set({ user: { ...user, status: { ...user.status, isOnline } } });
        },

                // ── Mot de passe oublié ──────────────────────────────────────────────

        /**
         * Envoie un OTP pour la réinitialisation du mot de passe
         */
        forgotPassword: async (email: string, role: "doctor" | "patient") => {
          set({ isLoading: true, error: null });
          try {
            const { authService } = await import("@/app/frontend/services/authService");
            await authService.sendOtp(email, role);
            set({ isLoading: false });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur lors de l'envoi du code";
            set({ error: message, isLoading: false });
            throw err;
          }
        },

        /**
         * Vérifie l'OTP reçu par email
         */
        verifyOtp: async (email: string, otp: string, role: "doctor" | "patient") => {
          set({ isLoading: true, error: null });
          try {
            const { authService } = await import("@/app/frontend/services/authService");
            await authService.verifyOtp(email, otp, role);
            set({ isLoading: false });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Code OTP invalide ou expiré";
            set({ error: message, isLoading: false });
            throw err;
          }
        },

        /**
         * Réinitialise le mot de passe après vérification OTP
         */
        resetPassword: async (email: string, otp: string, newPassword: string, role: "doctor" | "patient") => {
          set({ isLoading: true, error: null });
          try {
            const { authService } = await import("@/app/frontend/services/authService");
            await authService.resetPassword(email, otp, newPassword, role);
            set({ isLoading: false });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur lors de la réinitialisation";
            set({ error: message, isLoading: false });
            throw err;
          }
        },

        /**
         * Renvoie un nouvel OTP
         */
        resendOtp: async (email: string, role: "doctor" | "patient") => {
          set({ isLoading: true, error: null });
          try {
            const { authService } = await import("@/app/frontend/services/authService");
            await authService.sendOtp(email, role);
            set({ isLoading: false });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur lors du renvoi du code";
            set({ error: message, isLoading: false });
            throw err;
          }
        },
        

        updateTelemedicine: (data) => {
          const { user } = get();
          if (!user || !isDoctor(user)) return;
          set({ user: { ...user, telemedicine: { ...user.telemedicine, ...data } } });
        },

        updateDoctorProfessional: (data) => {
          const { user } = get();
          if (!user || !isDoctor(user)) return;
          set({ user: { ...user, professional: { ...user.professional, ...data } } });
        },

        updateDoctorStatus: (data) => {
          const { user } = get();
          if (!user || !isDoctor(user)) return;
          set({ user: { ...user, status: { ...user.status, ...data } } });
        },

        updateDoctorPreferences: (prefs) => {
          const { user } = get();
          if (!user || !isDoctor(user)) return;
          set({ user: { ...user, preferences: { ...user.preferences, ...prefs } } });
        },

        updateProfilePhoto: (photoUrl: string) => {
          const { user } = get();
          if (!user) return;
          // Met à jour la photo dans le profile du user, que ce soit patient ou médecin
            if (isPatient(user)) {
              set({ user: { ...user, profile: { ...user.profile, photo: photoUrl } } });
            } else if (isDoctor(user)) {
              set({ user: { ...user, profile: { ...user.profile, photo: photoUrl } } });
          }
        },

        updateHealth: (health) => {
          const { user } = get();
          if (!user || !isPatient(user)) return;
          set({ user: { ...user, health: { ...user.health, ...health } } });
        },

        updatePreferences: (prefs) => {
          const { user } = get();
          if (!user || !isPatient(user)) return;
          set({ user: { ...user, preferences: { ...user.preferences, ...prefs } } });
        },

        logout: () =>
          set({ user: null, token: null, refreshToken: null, isAuthenticated: false, error: null }),

        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
      }),

      {
        name: "auth-storage",
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true); // Indique que le store a été rechargé depuis le localStorage
        },
        partialize: (state) => {
          if (!state.user) {
            return {
              token: state.token,
              refreshToken: state.refreshToken,
              isAuthenticated: state.isAuthenticated,
              user: null,
            };
          }
        
          const { security, ...userWithoutSecurity } = state.user as any;

          const rawId = (state.user as any)._id;
          const id = state.user._id
            
            return {
              token: state.token,
              refreshToken: state.refreshToken,
              isAuthenticated: state.isAuthenticated,
                user: {
                  ...userWithoutSecurity,
                  _id: id,
                },
            };
        },
        
      }

    ),
    { name: "AuthStore", enabled: process.env.NODE_ENV === "development" }
  )
);