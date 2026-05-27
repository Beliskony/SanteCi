'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PaymentPage from '@/app/frontend/components/paymentComponents/PaymentPage';
import { useAppointmentStore } from '@/app/frontend/store/appoitmentStore';
import { useAuthStore, isPatient } from '@/app/frontend/store/useAuthStore';
import type { PopulatedDoctor } from '@/app/frontend/types/Appointment';

function Page() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const appointmentId = searchParams.get('appointmentId');

  const isMounted = useRef(true);

  // ✅ Sélecteurs atomiques — pas de destructuring du store entier
  const currentAppointment = useAppointmentStore((s) => s.currentAppointment);
  const fetchById          = useAppointmentStore((s) => s.fetchById);
  const storeError         = useAppointmentStore((s) => s.error);
  const user               = useAuthStore((s) => s.user);

  const [pageProps,   setPageProps]   = useState<{
    doctorName:   string;
    specialty:    string;
    scheduledFor: Date;
    consultType:  string;
    amount:       number;
    patientId:    string; // ✅ nécessaire pour InitiatePaymentDTO backend
  } | null>(null);

  const [fetchError,  setFetchError]  = useState<string | null>(null);
  // ✅ FIX #1 — flag local pour ne fetcher qu'une seule fois
  const hasFetched = useRef(false);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Auth guard
  useEffect(() => {
    if (!user && appointmentId) {
      router.push(`/auth/login?redirect=/payment?appointmentId=${appointmentId}`);
    }
  }, [user, router, appointmentId]);

  // ✅ FIX #1 — fetchById une seule fois grâce à hasFetched.current
  // Plus de isLoadingAppointment dans les deps → plus de boucle
  useEffect(() => {
    if (!appointmentId || hasFetched.current) return;
    // Si le RDV est déjà en store et correspond → pas besoin de refetch
    if (currentAppointment?._id === appointmentId) return;

    hasFetched.current = true;
    setFetchError(null);

    fetchById(appointmentId).catch((err) => {
      if (isMounted.current) {
        setFetchError(err instanceof Error ? err.message : "Rendez-vous introuvable.");
      }
    });
  }, [appointmentId]); // ← fetchById stable Zustand, currentAppointment hors deps intentionnellement

  // Extraire les props quand le RDV est chargé
  useEffect(() => {
    if (!currentAppointment || currentAppointment._id !== appointmentId) return;
    if (!isMounted.current) return;

    let doctorName = "Dr. Non spécifié";
    let specialty  = "Généraliste";

    if (typeof currentAppointment.doctorId === 'object' && currentAppointment.doctorId !== null) {
      const doctor = currentAppointment.doctorId as PopulatedDoctor;
      doctorName = `${doctor.profile?.title ?? 'Dr'} ${doctor.profile?.firstName ?? ''} ${doctor.profile?.lastName ?? ''}`.trim();
      specialty  = doctor.profile?.specialty ?? 'Généraliste';
    }

    const consultTypeMap: Record<string, string> = {
      video:     'Téléconsultation vidéo',
      audio:     'Téléconsultation audio',
      chat:      'Consultation par chat',
      in_person: 'Consultation en cabinet',
    };

    // ✅ FIX #2 — patientId extrait pour le passer à PaymentPage
    const patientId = typeof currentAppointment.patientId === 'object'
      ? (currentAppointment.patientId as any)._id?.toString() ?? ""
      : String(currentAppointment.patientId);

    setPageProps({
      doctorName,
      specialty,
      scheduledFor: new Date(currentAppointment.details.scheduledFor),
      consultType:  consultTypeMap[currentAppointment.details.type] ?? 'Consultation',
      amount:       currentAppointment.payment.amount,
      patientId,
    });
  }, [currentAppointment, appointmentId]);

  const handleBack    = useCallback(() => { router.back(); }, [router]);
  const handleSuccess = useCallback(() => {
    router.push(`/appointments/confirmation?appointmentId=${appointmentId}`);
  }, [router, appointmentId]);

  // ── Guards d'affichage ────────────────────────────────────────────────────

  if (!appointmentId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Aucun rendez-vous spécifié</p>
          <button onClick={() => router.push('/medecins')}
            className="mt-4 px-4 py-2 bg-[#1e3a8a] text-white rounded-xl text-sm font-semibold">
            Choisir un médecin
          </button>
        </div>
      </div>
    );
  }

  // ✅ FIX #1 — afficher l'erreur sans refetch
  const displayError = fetchError ?? (storeError && hasFetched.current ? storeError : null);
  if (displayError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">{displayError}</p>
          <p className="text-xs text-slate-400 mt-1">ID : {appointmentId}</p>
          <button onClick={() => router.push('/medecins')}
            className="mt-4 px-4 py-2 bg-[#1e3a8a] text-white rounded-xl text-sm font-semibold">
            Retour aux médecins
          </button>
        </div>
      </div>
    );
  }

  if (!pageProps) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Chargement des informations...</p>
        </div>
      </div>
    );
  }

  if (user && !isPatient(user)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="font-medium">Accès réservé aux patients</p>
          <button onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-[#1e3a8a] text-white rounded-xl text-sm font-semibold">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <PaymentPage
      appointmentId={appointmentId}
      patientId={pageProps.patientId}
      doctorName={pageProps.doctorName}
      specialty={pageProps.specialty}
      scheduledFor={pageProps.scheduledFor}
      consultType={pageProps.consultType}
      amount={pageProps.amount}
      onBack={handleBack}
      onSuccess={handleSuccess}
    />
  );
}

export default Page;