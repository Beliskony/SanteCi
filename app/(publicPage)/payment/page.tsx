'use client';

import { Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PaymentPage from '@/app/frontend/components/paymentComponents/PaymentPage';
import { useAuthStore, isPatient } from '@/app/frontend/store/useAuthStore';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const user         = useAuthStore((s) => s.user);

  // Lecture sécurisée — searchParams n'est jamais null ici
  // (useSearchParams() retourne un objet URLSearchParams, pas null)
  const get = (key: string) => searchParams?.get(key) ?? null;

  const doctorId     = get('doctorId');
  const patientId    = get('patientId');
  const type         = get('type');
  const scheduledFor = get('scheduledFor');
  const duration     = get('duration');
  const reason       = get('reason');
  const amount       = Number(get('amount') ?? '0');
  const doctorName   = get('doctorName') ?? 'Dr. Non spécifié';
  const specialty    = get('specialty')  ?? 'Généraliste';

  const handleBack    = useCallback(() => router.back(), [router]);
  const handleSuccess = useCallback((appointmentId: string) => {
    router.push(`/appointments/confirmation?appointmentId=${appointmentId}`);
  }, [router]);

  // Guards
  if (!doctorId || !patientId || !scheduledFor || !amount) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-sm">Paramètres de paiement manquants.</p>
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
      doctorName={doctorName}
      specialty={specialty}
      scheduledFor={new Date(scheduledFor)}
      consultType={type ?? 'video'}
      amount={amount}
      bookingData={{
        doctorId,
        patientId,
        type:         type ?? 'video',
        scheduledFor,
        duration:     Number(duration ?? '30'),
        reason:       reason ?? '',
        amount,
      }}
      patientId={patientId}
      onBack={handleBack}
      onSuccess={handleSuccess}
    />
  );
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