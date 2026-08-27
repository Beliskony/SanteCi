// app/(publicPage)/appointments/confirmation/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Calendar, Clock, User, Stethoscope, ArrowLeft, CreditCard } from 'lucide-react';
import { useAppointmentStore } from '@/app/frontend/store/appoitmentStore';
import { useAuthStore, isPatient } from '@/app/frontend/store/useAuthStore';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams?.get('appointmentId');
  
  const { appointments, fetchList, fetchById, currentAppointment, isLoading } = useAppointmentStore();
  const user = useAuthStore((s) => s.user);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appointmentId && user) {
      const loadAppointment = async () => {
        try {
          // Récupérer le rendez-vous par son ID
          await fetchById(appointmentId);
          
          // Ou alternativement charger la liste pour avoir le contexte
          if (isPatient(user)) {
            await fetchList({ patientId: user._id });
          }
        } catch (error) {
          console.error('Erreur chargement rendez-vous:', error);
        } finally {
          setLoading(false);
        }
      };
      loadAppointment();
    } else {
      setLoading(false);
    }
  }, [appointmentId, fetchById, fetchList, user]);

  // Utiliser currentAppointment du store ou le trouver dans la liste
  const appointment = currentAppointment || appointments.find((a: any) => a._id === appointmentId);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Chargement du rendez-vous...</p>
        </div>
      </div>
    );
  }

  if (!appointmentId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Aucun rendez-vous trouvé.</p>
          <button
            onClick={() => router.push('/patient/dashboard')}
            className="mt-4 text-[#1e3a8a] text-sm font-medium underline"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // Récupérer les infos du médecin (populé ou non)
  const doctor = typeof appointment?.doctorId === 'object' ? appointment?.doctorId : null;
  const doctorName = doctor?.profile 
    ? `Dr. ${doctor.profile.firstName || ''} ${doctor.profile.lastName || ''}` 
    : 'Médecin non spécifié';
  const specialty = doctor?.profile?.specialty || 'Généraliste';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Carte de confirmation */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Icône de succès */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Rendez-vous confirmé !
          </h1>
          <p className="text-slate-500 mb-6">
            Votre paiement a été effectué avec succès. Voici les détails de votre consultation.
          </p>

          {/* Détails du rendez-vous */}
          {appointment ? (
            <div className="bg-slate-50 rounded-xl p-6 text-left space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#1e3a8a]" />
                <div>
                  <p className="text-sm text-slate-500">Médecin</p>
                  <p className="font-medium text-slate-800">{doctorName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-[#1e3a8a]" />
                <div>
                  <p className="text-sm text-slate-500">Spécialité</p>
                  <p className="font-medium text-slate-800">{specialty}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#1e3a8a]" />
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium text-slate-800">
                    {appointment.details?.scheduledFor
                      ? new Date(appointment.details.scheduledFor).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Date non spécifiée'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#1e3a8a]" />
                <div>
                  <p className="text-sm text-slate-500">Heure</p>
                  <p className="font-medium text-slate-800">
                    {appointment.details?.scheduledFor
                      ? new Date(appointment.details.scheduledFor).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Heure non spécifiée'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#1e3a8a]" />
                <div>
                  <p className="text-sm text-slate-500">Montant payé</p>
                  <p className="font-medium text-slate-800">
                    {appointment.payment?.amount || 0} {appointment.payment?.currency || 'XOF'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-slate-500">Statut</p>
                  <p className="font-medium text-slate-800">
                    {appointment.status?.current === 'pending' ? 'En attente de confirmation' :
                     appointment.status?.current === 'confirmed' ? 'Confirmé' :
                     appointment.status?.current === 'ongoing' ? 'En cours' :
                     appointment.status?.current === 'completed' ? 'Terminé' :
                     appointment.status?.current || 'Non spécifié'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">Détails du rendez-vous non disponibles.</p>
          )}

          {/* Boutons d'action */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/patient/dashboard')}
              className="px-6 py-3 bg-[#1e3a8a] text-white rounded-lg font-medium hover:bg-[#1a2f7a] transition-colors"
            >
              Voir mes rendez-vous
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </button>
          </div>

          {/* ID de référence */}
          <p className="mt-6 text-xs text-slate-400">
            Référence : {appointment?._id || appointmentId}
          </p>
        </div>
      </div>
    </div>
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

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmationContent />
    </Suspense>
  );
}