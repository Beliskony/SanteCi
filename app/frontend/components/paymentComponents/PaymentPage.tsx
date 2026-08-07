"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft }           from "lucide-react";
import { usePaymentStore }     from "@/app/frontend/store/paymentStore";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import { useAuthStore }        from "@/app/frontend/store/useAuthStore";
import { BookingStepper }      from "./BookingStepper";
import { PaymentForm }         from "./PaymentForm";
import { PaymentSummary }      from "./PaymentSummary";
import { SubscriptionSummary } from "./SubscriptionSumarry";
import type { BookingStep }    from "./BookingStepper";
import type { ConsultationType, Currency, PaymentMethod, Priority, PaymentProvider } from "@/app/frontend/types/Appointment";
import type { PaymentChannel, SubscriptionPlan } from "@/app/frontend/services/paymentService";
import { loadPaiementProSDK } from "@/app/frontend/lib/paiementPro";

// ─── SDK PaiementPro (chargé dynamiquement) ───────────────────────────────────
declare global {
  interface Window {
    PaiementPro: new (merchantId: string) => {
      amount:              number;
      description:         string;
      channel:             string;
      countryCurrencyCode: string;
      referenceNumber:     string;
      customerEmail:       string;
      customerFirstName:   string;
      customerLastname:    string;
      customerPhoneNumber: string;
      notificationURL:     string;
      returnURL:           string;
      returnContext:       string;
      url:                 string;
      success:             boolean;
      getUrlPayment:       () => Promise<void>;
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingData {
  doctorId:     string;
  patientId:    string;
  type:         string;
  scheduledFor: string;
  duration:     number;
  reason:       string;
  amount:       number;
}

// Deux modes distincts : consultation (patient paie un RDV) ou
// subscription (médecin paie son abonnement Premium/Elite)
type PaymentPageProps =
  | {
      mode:         "consultation";
      bookingData:  BookingData;
      patientId:    string;
      doctorName:   string;
      specialty:    string;
      scheduledFor: Date | string;
      consultType:  string;
      amount:       number;
      onBack:       () => void;
      onSuccess:    (appointmentId: string) => void;
    }
  | {
      mode:   "subscription";
      plan:   SubscriptionPlan;
      amount: number;
      onBack: () => void;
      onSuccess: (referenceNumber: string) => void;
    };

const MERCHANT_ID = process.env.NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID!;
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL!;

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PaymentPage(props: PaymentPageProps) {
  const { mode, amount, onBack } = props;

  const initiate             = usePaymentStore((s) => s.initiate);
  const initiateSubscription = usePaymentStore((s) => s.initiateSubscription);
  const isLoading             = usePaymentStore((s) => s.isLoading);
  const error                 = usePaymentStore((s) => s.error);
  const clearError            = usePaymentStore((s) => s.clearError);
  const create                = useAppointmentStore((s) => s.create);
  const user                  = useAuthStore((s) => s.user);

  // ── Verrou anti double-soumission (identique pour les deux modes) ──────
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadPaiementProSDK().catch(console.error); }, []);

  const handleSubmit = useCallback(async (
    channel: PaymentChannel,
    phone:   string,
  ) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    clearError();
    try {
      let referenceNumber: string;
      let description: string;
      let returnURL: string;
      let returnContext: object;

      if (mode === "consultation") {
        // ── Flow consultation : créer le RDV puis initier le paiement ────
        const appointment = await create({
          patientId:    props.bookingData.patientId,
          doctorId:     props.bookingData.doctorId,
          type:         props.bookingData.type as ConsultationType,
          scheduledFor: props.bookingData.scheduledFor,
          duration:     props.bookingData.duration,
          reason:       props.bookingData.reason,
          symptoms:     [],
          priority:     'medium' as Priority,
          payment: {
            amount,
            currency: 'XOF' as Currency,
            method:   (channel === 'CARD' ? 'card' : 'mobile_money') as PaymentMethod,
            provider: channel.toLowerCase() as PaymentProvider,
          },
        });

        referenceNumber = `SANTE-${appointment._id}-${Date.now()}`;

        await initiate({
          appointmentId: appointment._id,
          amount,
          currency:      'XOF',
          channel,
          referenceNumber,
        });

        description   = `Consultation médicale SantéCI — ${props.doctorName}`;
        returnURL      = `${APP_URL}/patient/rdv/pay/${appointment._id}?ref=${referenceNumber}`;
        returnContext  = { type: 'consultation', appointmentId: appointment._id, referenceNumber };

      } else {
        // ── Flow abonnement : pas de RDV, juste l'abonnement du médecin ──
        referenceNumber = `SANTE-SUB-${user?._id}-${Date.now()}`;

        await initiateSubscription({
          plan: props.plan,
          amount,
          currency: 'XOF',
          channel,
          referenceNumber,
        });

        description   = `Abonnement ${props.plan === 'elite' ? 'Elite' : 'Premium'} SantéCI`;
        returnURL      = `${APP_URL}/doctor/parametres/abonnement?ref=${referenceNumber}`;
        returnContext  = { type: 'subscription', plan: props.plan, referenceNumber };
      }

      // ── Charger SDK et obtenir l'URL (commun aux deux modes) ────────────
      await loadPaiementProSDK();

      const pp = new window.PaiementPro(MERCHANT_ID);

      pp.amount              = amount;
      pp.description         = description;
      pp.channel             = channel;
      pp.countryCurrencyCode = '952';
      pp.referenceNumber     = referenceNumber;
      pp.customerEmail       = (user as any)?.contact?.email ?? '';
      pp.customerFirstName   = (user as any)?.profile?.firstName ?? '';
      pp.customerLastname    = (user as any)?.profile?.lastName  ?? '';
      pp.customerPhoneNumber = phone || ((user as any)?.contact?.phone ?? '');
      pp.notificationURL     = `${APP_URL}/api/webhooks/paiementpro`;
      pp.returnURL           = returnURL;
      pp.returnContext       = JSON.stringify(returnContext);

      await pp.getUrlPayment();

      if (pp.success && pp.url) {
        window.location.href = pp.url;
      } else {
        throw new Error("Impossible d'obtenir l'URL de paiement PaiementPro.");
      }

    } catch (err: any) {
      console.error('[PaymentPage]', err?.message);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [mode, props, amount, user, create, initiate, initiateSubscription, clearError]);

  const headerLabel = mode === "consultation"
    ? "Paiement de la consultation"
    : "Paiement de l'abonnement";

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a] transition-colors font-medium"
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <span className="text-sm font-semibold text-slate-700">{headerLabel}</span>
        <div className="w-16" />
      </header>

      {/* Stepper — uniquement pertinent pour le flow consultation (RDV) */}
      {mode === "consultation" && (
        <div className="bg-white border-b border-slate-100 px-6 py-5">
          <BookingStepper currentStep={3 as BookingStep} />
        </div>
      )}

      {/* Corps */}
      <div className="max-w-3xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <PaymentForm
          amount={amount}
          onSubmit={handleSubmit}
          isLoading={isLoading || isSubmitting}
          error={error}
        />

        {mode === "consultation" ? (
          <PaymentSummary
            doctorName={props.doctorName}
            specialty={props.specialty}
            scheduledFor={props.scheduledFor}
            consultType={props.consultType}
            amount={amount}
          />
        ) : (
          <SubscriptionSummary plan={props.plan} amount={amount} />
        )}
      </div>

    </div>
  );
}