'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PaymentPage from '@/app/frontend/components/paymentComponents/PaymentPage';
import { useAuthStore, isPatient, isDoctor } from '@/app/frontend/store/useAuthStore';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const user         = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<'consultation' | 'subscription' | null>(null);
  const [loading, setLoading] = useState(true);

  const get = (key: string) => searchParams?.get(key) ?? null;

  useEffect(() => {
    if (!searchParams) {
      setLoading(false);
      return;
    }

    // ── Détection du mode ────────────────────────────────────────────────
    const explicitMode = get('mode');
    const plan = get('plan');
    const doctorId = get('doctorId');
    const scheduledFor = get('scheduledFor');

    // 1. Mode explicite dans l'URL
    if (explicitMode === 'consultation' || explicitMode === 'subscription') {
      setMode(explicitMode);
      setLoading(false);
      return;
    }

    // 2. Si c'est un médecin et qu'il y a un plan → abonnement
    if (user && isDoctor(user) && plan) {
      setMode('subscription');
      setLoading(false);
      return;
    }

    // 3. Si c'est un patient et qu'il y a doctorId + scheduledFor → consultation
    if (user && isPatient(user) && doctorId && scheduledFor) {
      setMode('consultation');
      setLoading(false);
      return;
    }

    // 4. Par la présence de paramètres spécifiques
    if (doctorId && scheduledFor) {
      setMode('consultation');
      setLoading(false);
      return;
    }

    if (plan) {
      setMode('subscription');
      setLoading(false);
      return;
    }

    // 5. Par défaut, si c'est un médecin → abonnement, si patient → consultation
    if (user) {
      if (isDoctor(user)) {
        setMode('subscription');
      } else if (isPatient(user)) {
        setMode('consultation');
      }
    }

    setLoading(false);
  }, [searchParams, user]);

  // ── Paramètres consultation ──────────────────────────────────────────────
  const doctorId     = get('doctorId');
  const patientId    = get('patientId') || user?._id;
  const type         = get('type');
  const scheduledFor = get('scheduledFor');
  const duration     = get('duration');
  const reason       = get('reason');
  const amount       = Number(get('amount') ?? '0');
  const doctorName   = get('doctorName') ?? 'Dr. Non spécifié';
  const specialty    = get('specialty')  ?? 'Généraliste';

  // ── Paramètres abonnement ──────────────────────────────────────────────
  const plan = get('plan') as 'premium' | 'elite' | null;

  const handleBack    = useCallback(() => router.back(), [router]);
  const handleSuccess = useCallback((id: string) => {
    if (mode === 'consultation') {
      router.push(`/appointments/confirmation?appointmentId=${id}`);
    } else {
      router.push(`/doctor/parametres/abonnement?success=true&ref=${id}`);
    }
  }, [router, mode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // ── Mode non détecté ─────────────────────────────────────────────────────
  if (!mode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-sm">Mode de paiement non détecté.</p>
          <p className="text-xs text-slate-400 mt-2">
            Veuillez vérifier les paramètres de l'URL.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-[#1e3a8a] text-sm font-medium underline"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // ── Mode consultation ────────────────────────────────────────────────────
  if (mode === 'consultation') {
    // Guards consultation
    if (!doctorId || !patientId || !scheduledFor || !amount) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 text-sm">Paramètres de consultation manquants.</p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-[#1e3a8a] text-sm font-medium underline"
            >
              Retour
            </button>
          </div>
        </div>
      );
    }

    if (user && !isPatient(user)) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-500 text-sm">Accès réservé aux patients.</p>
        </div>
      );
    }

    return (
      <PaymentPage
        mode="consultation"
        doctorName={doctorName}
        specialty={specialty}
        scheduledFor={new Date(scheduledFor)}
        consultType={type ?? 'video'}
        amount={amount}
        bookingData={{
          doctorId,
          patientId,
          type: type ?? 'video',
          scheduledFor,
          duration: Number(duration ?? '30'),
          reason: reason ?? '',
          amount,
        }}
        patientId={patientId}
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    );
  }

  // ── Mode abonnement ──────────────────────────────────────────────────────
  if (mode === 'subscription') {
    // Guards abonnement
    if (!plan) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 text-sm">Plan d'abonnement manquant.</p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-[#1e3a8a] text-sm font-medium underline"
            >
              Retour
            </button>
          </div>
        </div>
      );
    }

    if (user && !isDoctor(user)) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-500 text-sm">Accès réservé aux médecins.</p>
        </div>
      );
    }

    return (
      <PaymentPage
        mode="subscription"
        plan={plan}
        amount={amount || (plan === 'elite' ? 15000 : 5000)} // Prix par défaut si non fourni
        onBack={handleBack}
        onSuccess={handleSuccess}
      />
    );
  }

  // Fallback
  return null;
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-slate-500">Chargement...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentContent />
    </Suspense>
  );
}