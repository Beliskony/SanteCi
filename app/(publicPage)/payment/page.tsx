'use client';

import { Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PaymentPage from '@/app/frontend/components/paymentComponents/PaymentPage';
import { useAuthStore, isPatient } from '@/app/frontend/store/useAuthStore';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Lire directement depuis les query params — pas de fetch
  const doctorId    = searchParams.get('doctorId');
  const patientId   = searchParams.get('patientId');
  const type        = searchParams.get('type');
  const scheduledFor= searchParams.get('scheduledFor');
  const duration    = searchParams.get('duration');
  const reason      = searchParams.get('reason');
  const amount      = Number(searchParams.get('amount'));
  const doctorName  = searchParams.get('doctorName') ?? 'Dr. Non spécifié';
  const specialty   = searchParams.get('specialty') ?? 'Généraliste';

  const handleBack    = useCallback(() => router.back(), [router]);
  const handleSuccess = useCallback((appointmentId: string) => {
    router.push(`/appointments/confirmation?appointmentId=${appointmentId}`);
  }, [router]);

  if (!doctorId || !patientId || !scheduledFor || !amount) {
    return /* guard erreur */ ;
  }

  if (user && !isPatient(user)) {
    return /* guard rôle */ ;
  }

  return (
    <PaymentPage
      // Infos affichage
      doctorName={doctorName}
      specialty={specialty}
      scheduledFor={new Date(scheduledFor)}
      consultType={type ?? 'video'}
      amount={amount}
      // Infos pour créer le RDV après paiement
      bookingData={{ doctorId, patientId, type: type ?? 'video', scheduledFor, duration: Number(duration), reason: reason ?? '', amount }}
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
 
function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentContent />
    </Suspense>
  );
}

export default Page;