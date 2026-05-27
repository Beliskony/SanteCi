"use client";

import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { usePaymentStore }     from "@/app/frontend/store/paymentStore";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import { BookingStepper }      from "./BookingStepper";
import { PaymentForm }         from "./PaymentForm";
import { PaymentSummary }      from "./PaymentSummary";
import type { BookingStep }    from "./BookingStepper";
import type { ConsultationType, Currency, PaymentMethod, Priority } from "@/app/frontend/types/Appointment";
import type {
  PaymentMethod as ServicePaymentMethod,
  PaymentProvider,
} from "@/app/frontend/services/paymentService";

type UIPaymentMethod = "wave";

const mapMethod = (m: UIPaymentMethod): ServicePaymentMethod =>
  m === "wave" ? "wave" : undefined as never;

const mapProvider = (m: UIPaymentMethod): PaymentProvider | undefined =>
  m === "wave" ? "wave" : undefined;

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

export default function PaymentPage({
  bookingData,
  patientId,
  doctorName, specialty, scheduledFor, consultType, amount,
  onBack, onSuccess,
}: PaymentPageProps) {
  const initiate   = usePaymentStore((s) => s.initiate);
  const simulate   = usePaymentStore((s) => s.simulate);
  const isLoading  = usePaymentStore((s) => s.isLoading);
  const error      = usePaymentStore((s) => s.error);
  const clearError = usePaymentStore((s) => s.clearError);
  const create     = useAppointmentStore((s) => s.create);

  const SERVICE_FEE = 500;
  const totalAmount = amount + SERVICE_FEE;

  const handleSubmit = useCallback(async (
    uiMethod: UIPaymentMethod,
    _phone?: string
  ) => {
    clearError();
    try {
      // 1 — Créer le RDV uniquement au moment du paiement
      const appointment = await create({
        patientId:    bookingData.patientId,
        doctorId:     bookingData.doctorId,
        type:         bookingData.type as ConsultationType,
        scheduledFor: bookingData.scheduledFor,
        duration:     bookingData.duration,
        reason:       bookingData.reason,
        symptoms:     [],
        priority:     "medium" as Priority,
        payment: {
          amount:   totalAmount,
          currency: "XOF" as Currency,
          method:   mapMethod(uiMethod) as PaymentMethod,
          provider: mapProvider(uiMethod),
        },
      });

      // 2 — Initier le paiement sur ce RDV
      await initiate({
        appointmentId: appointment._id,
        amount:        totalAmount,
        currency:      "XOF",
        method:        mapMethod(uiMethod),
        provider:      mapProvider(uiMethod),
      });

      // 3 — Simuler succès (à remplacer par webhook Wave en prod)
      const result = await simulate(appointment._id, "success");

      if (result.status === "paid") {
        onSuccess(appointment._id);
      }
    } catch {
      // Erreur gérée dans les stores (paymentStore.error)
    }
  }, [bookingData, totalAmount, create, initiate, simulate, clearError, onSuccess]);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex relative">

        <button onClick={onBack}
          className=" absolute right-6 mt-3 transform -translate-y-1/2 flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a] transition-colors font-medium">
          <ArrowLeft size={15} />
          Retour au profil
        </button>
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <BookingStepper currentStep={3 as BookingStep} />
      </div>

      {/* Corps */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <PaymentForm
          totalAmount={totalAmount}
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
          serviceFee={SERVICE_FEE}
        />
      </div>
    </div>
  );
}