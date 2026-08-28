import { AuthUser, isPatient, isDoctor } from '@/app/frontend/store/useAuthStore';

export type PaymentMode = 'consultation' | 'subscription';

export interface PaymentModeDetectionResult {
  mode: PaymentMode;
  params: {
    doctorId?: string;
    patientId?: string;
    type?: string;
    scheduledFor?: string;
    duration?: string;
    reason?: string;
    doctorName?: string;
    specialty?: string;
    plan?: 'premium' | 'elite';
    amount: number;
  };
}

export function detectPaymentMode(
  searchParams: URLSearchParams,
  user: AuthUser | null
): PaymentModeDetectionResult | null {
  const get = (key: string) => searchParams?.get(key) ?? null;

  const explicitMode = get('mode');
  if (explicitMode === 'subscription' || explicitMode === 'consultation') {
    return buildResult(explicitMode as PaymentMode, searchParams);
  }

  if (user) {
    if (isDoctor(user)) {
      const plan = get('plan') as 'premium' | 'elite' | null;
      if (plan) {
        return buildResult('subscription', searchParams);
      }
    }
    
    if (isPatient(user)) {
      const doctorId = get('doctorId');
      const scheduledFor = get('scheduledFor');
      if (doctorId && scheduledFor) {
        return buildResult('consultation', searchParams);
      }
    }
  }

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

  // Vérification du chemin URL uniquement côté client
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    if (pathname.includes('/patient/rdv/') || pathname.includes('/appointments/')) {
      return buildResult('consultation', searchParams);
    }
    if (pathname.includes('/doctor/parametres/') || pathname.includes('/doctor/subscription')) {
      return buildResult('subscription', searchParams);
    }
  }

  return null;
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