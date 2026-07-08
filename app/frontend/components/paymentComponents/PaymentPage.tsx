"use client";

import { useCallback, useEffect } from "react";
import { ArrowLeft }           from "lucide-react";
import { usePaymentStore }     from "@/app/frontend/store/paymentStore";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import { useAuthStore }        from "@/app/frontend/store/useAuthStore";
import { BookingStepper }      from "./BookingStepper";
import { PaymentForm }         from "./PaymentForm";
import { PaymentSummary }      from "./PaymentSummary";
import type { BookingStep }    from "./BookingStepper";
import type { ConsultationType, Currency, PaymentMethod, Priority, PaymentProvider } from "@/app/frontend/types/Appointment";
import type { PaymentChannel } from "@/app/frontend/services/paymentService";
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

interface PaymentPageProps {
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

const MERCHANT_ID = process.env.NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID!;
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL!;
const isDev       = process.env.NODE_ENV === 'development';


// ─── Composant ────────────────────────────────────────────────────────────────

export default function PaymentPage({
  bookingData, patientId,
  doctorName, specialty, scheduledFor, consultType,
  amount, onBack, onSuccess,
}: PaymentPageProps) {
  const initiate   = usePaymentStore((s) => s.initiate);
  const isLoading  = usePaymentStore((s) => s.isLoading);
  const error      = usePaymentStore((s) => s.error);
  const clearError = usePaymentStore((s) => s.clearError);
  const create     = useAppointmentStore((s) => s.create);
  const user       = useAuthStore((s) => s.user);

  // Précharger le SDK au montage
  useEffect(() => { loadPaiementProSDK().catch(console.error); }, []);

// PaymentPage.tsx — handleSubmit sans isDev, flow PaiementPro uniquement
const handleSubmit = useCallback(async (
  channel: PaymentChannel,
  phone:   string,
) => {
  clearError();
  try {
    // 1 — Créer le rendez-vous
    const appointment = await create({
      patientId:    bookingData.patientId,
      doctorId:     bookingData.doctorId,
      type:         bookingData.type as ConsultationType,
      scheduledFor: bookingData.scheduledFor,
      duration:     bookingData.duration,
      reason:       bookingData.reason,
      symptoms:     [],
      priority:     'medium' as Priority,
      payment: {
        amount,
        currency: 'XOF' as Currency,
        method:   (channel === 'CARD' ? 'card' : 'mobile_money') as PaymentMethod,
        provider: channel.toLowerCase() as PaymentProvider,
      },
    });

    const referenceNumber = `SANTE-${appointment._id}-${Date.now()}`;

    // 2 — Enregistrer en base
    await initiate({
      appointmentId: appointment._id,
      amount,
      currency:      'XOF',
      channel,
      referenceNumber,
    });

    // 3 — Charger SDK et obtenir l'URL
    await loadPaiementProSDK();

    const pp = new window.PaiementPro(MERCHANT_ID);

    pp.amount              = amount;
    pp.description         = `Consultation médicale SantéCI — ${doctorName}`;
    pp.channel             = channel;
    pp.countryCurrencyCode = '952';
    pp.referenceNumber     = referenceNumber;
    pp.customerEmail       = (user as any)?.email ?? '';
    pp.customerFirstName   = (user as any)?.profile?.firstName ?? '';
    pp.customerLastname    = (user as any)?.profile?.lastName  ?? '';
    pp.customerPhoneNumber = phone || ((user as any)?.profile?.phone ?? '');
    pp.notificationURL     = `${APP_URL}/api/webhooks/paiementpro`;
    pp.returnURL           = `${APP_URL}/patient/rdv/pay/${appointment._id}?ref=${referenceNumber}`;
    pp.returnContext       = JSON.stringify({ appointmentId: appointment._id, referenceNumber });

    await pp.getUrlPayment();

    if (pp.success && pp.url) {
      window.location.href = pp.url;
    } else {
      throw new Error("Impossible d'obtenir l'URL de paiement PaiementPro.");
    }

  } catch (err: any) {
    console.error('[PaymentPage]', err?.message);
  }
}, [bookingData, amount, user, doctorName, create, initiate, clearError]);

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
        <span className="text-sm font-semibold text-slate-700">Paiement de la consultation</span>
        <div className="w-16" />
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <BookingStepper currentStep={3 as BookingStep} />
      </div>

      {/* Corps */}
      <div className="max-w-3xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <PaymentForm
          amount={amount}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />
        <PaymentSummary
          doctorName={doctorName}
          specialty={specialty}
          scheduledFor={scheduledFor}
          consultType={consultType}
          amount={amount}
        />
      </div>

    </div>
  );
}