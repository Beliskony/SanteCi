// app/frontend/lib/paymentModeDetector.ts
import { AuthUser, isPatient, isDoctor } from '@/app/frontend/store/useAuthStore';

export type PaymentMode = 'consultation' | 'subscription';

export interface PaymentModeDetectionResult {
  mode: PaymentMode;
  params: {
    // Consultation
    doctorId?: string;
    patientId?: string;
    type?: string;
    scheduledFor?: string;
    duration?: string;
    reason?: string;
    doctorName?: string;
    specialty?: string;
    // Subscription
    plan?: 'premium' | 'elite';
    // Communs
    amount: number;
  };
}

export function detectPaymentMode(
  searchParams: URLSearchParams,
  user: AuthUser | null
): PaymentModeDetectionResult | null {
  const get = (key: string) => searchParams?.get(key) ?? null;

  // ── 1. Vérifier les paramètres explicites ──────────────────────────────
  const explicitMode = get('mode');
  if (explicitMode === 'subscription' || explicitMode === 'consultation') {
    return buildResult(explicitMode as PaymentMode, searchParams);
  }

  // ── 2. Vérifier par le rôle de l'utilisateur ───────────────────────────
  if (user) {
    // Si l'utilisateur est un médecin → probablement un abonnement
    if (isDoctor(user)) {
      const plan = get('plan') as 'premium' | 'elite' | null;
      if (plan) {
        return buildResult('subscription', searchParams);
      }
    }
    
    // Si l'utilisateur est un patient → probablement une consultation
    if (isPatient(user)) {
      const doctorId = get('doctorId');
      const scheduledFor = get('scheduledFor');
      if (doctorId && scheduledFor) {
        return buildResult('consultation', searchParams);
      }
    }
  }

  // ── 3. Vérifier par la présence de paramètres spécifiques ──────────────
  const hasConsultationParams = 
    get('doctorId') && get('scheduledFor') && get('patientId');
  
  const hasSubscriptionParams = 
    get('plan') && (get('plan') === 'premium' || get('plan') === 'elite');

  if (hasConsultationParams && !hasSubscriptionParams) {
    return buildResult('consultation', searchParams);
  }

  if (hasSubscriptionParams && !hasConsultationParams) {
    return buildResult('subscription', searchParams);
  }

  // ── 4. Vérifier par le chemin URL ──────────────────────────────────────
  // Si on est sur une page de rendez-vous
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    if (pathname.includes('/patient/rdv/') || pathname.includes('/appointments/')) {
      return buildResult('consultation', searchParams);
    }
    if (pathname.includes('/doctor/parametres/') || pathname.includes('/doctor/subscription')) {
      return buildResult('subscription', searchParams);
    }
  }

  return null; // Mode non détecté
}

function buildResult(
  mode: PaymentMode,
  params: URLSearchParams
): PaymentModeDetectionResult {
  const get = (key: string) => params?.get(key) ?? null;

  const result: PaymentModeDetectionResult = {
    mode,
    params: {
      amount: Number(get('amount') ?? '0'),
    },
  };

  if (mode === 'consultation') {
    result.params.doctorId = get('doctorId') || undefined;
    result.params.patientId = get('patientId') || undefined;
    result.params.type = get('type') || undefined;
    result.params.scheduledFor = get('scheduledFor') || undefined;
    result.params.duration = get('duration') || undefined;
    result.params.reason = get('reason') || undefined;
    result.params.doctorName = get('doctorName') || undefined;
    result.params.specialty = get('specialty') || undefined;
  } else {
    result.params.plan = (get('plan') as 'premium' | 'elite') || undefined;
  }

  return result;
}

// Hook personnalisé pour utiliser le détecteur dans les composants
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/app/frontend/store/useAuthStore';

export function usePaymentMode() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [modeInfo, setModeInfo] = useState<{
    mode: PaymentMode;
    props: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!searchParams) {
      setLoading(false);
      return;
    }

    const detection = detectPaymentMode(searchParams, user);
    
    if (!detection) {
      setLoading(false);
      setModeInfo(null);
      return;
    }

    const { mode, params } = detection;

    // Construire les props selon le mode détecté
    const props = {
      mode,
      amount: params.amount,
      ...(mode === 'consultation' ? {
        doctorId: params.doctorId,
        patientId: params.patientId || user?._id,
        doctorName: params.doctorName || 'Dr. Non spécifié',
        specialty: params.specialty || 'Généraliste',
        scheduledFor: params.scheduledFor ? new Date(params.scheduledFor) : new Date(),
        consultType: params.type || 'video',
        duration: Number(params.duration || '30'),
        reason: params.reason || '',
      } : {
        plan: params.plan || 'premium',
      }),
    };

    setModeInfo({ mode, props });
    setLoading(false);
  }, [searchParams, user]);

  return { modeInfo, loading };
}