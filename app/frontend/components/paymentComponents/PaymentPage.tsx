"use client";

import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { usePaymentStore }     from "@/app/frontend/store/paymentStore";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import { BookingStepper }      from "./BookingStepper";
import { PaymentForm }         from "./PaymentForm";
import { PaymentSummary }      from "./PaymentSummary";
import type { BookingStep }    from "./BookingStepper";
import type {
  PaymentMethod as ServicePaymentMethod,
  PaymentProvider,
} from "@/app/frontend/services/paymentService";

type UIPaymentMethod = "orange_money" | "mtn_money" | "card";

// Mapper méthode UI → méthode service
const mapMethod = (m: UIPaymentMethod): ServicePaymentMethod =>
  m === "card" ? "card" : "mobile_money";

// Mapper provider
const mapProvider = (m: UIPaymentMethod): PaymentProvider | undefined =>
  m === "orange_money" ? "orange_money"
  : m === "mtn_money"  ? "mtn_money"
  : undefined;

interface PaymentPageProps {
  appointmentId: string;
  patientId:     string; // FIX #2 — requis par le backend
  doctorName:    string;
  specialty:     string;
  scheduledFor:  Date | string;
  consultType:   string;
  amount:        number;
  onBack:        () => void;
  onSuccess:     () => void;
}

export default function PaymentPage({
  appointmentId, patientId,
  doctorName, specialty, scheduledFor, consultType, amount,
  onBack, onSuccess,
}: PaymentPageProps) {
  const initiate      = usePaymentStore((s) => s.initiate);
  const isLoading     = usePaymentStore((s) => s.isLoading);
  const error         = usePaymentStore((s) => s.error);
  const clearError    = usePaymentStore((s) => s.clearError);
  const updatePayment = useAppointmentStore((s) => s.updatePayment);

  const SERVICE_FEE = 500;
  const totalAmount = amount + SERVICE_FEE;

  const handleSubmit = useCallback(async (
    uiMethod: UIPaymentMethod,
    _phone?: string
  ) => {
    clearError();
    try {
      const result = await initiate({
        appointmentId,
        amount:   totalAmount,
        currency: "XOF",
        method:   mapMethod(uiMethod),
        provider: mapProvider(uiMethod),
        // FIX #2 — patientId passé au service
        // Note : si ton InitiatePaymentDTO frontend ne l'a pas encore,
        // ajoute patientId?: string dedans
        ...(patientId ? { patientId } : {}),
      } as any);

      // FIX #3 — result.status (pas paymentStatus) + simulatedAt optionnel
      if (result.status === "paid") {
        await updatePayment(appointmentId, {
          paymentStatus: "paid",
          transactionId: result.transactionId,
          paidAt:        result.simulatedAt
            ? new Date(result.simulatedAt).toISOString()
            : new Date().toISOString(),
        });
        onSuccess();
      }
    } catch {
      // Erreur gérée dans le store
    }
  }, [appointmentId, patientId, totalAmount, initiate, updatePayment, clearError, onSuccess]);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] flex items-center justify-center">
            <span className="text-white text-xs font-black">S</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">SantéCI</p>
            <p className="text-[10px] text-slate-400">Réservation sécurisée</p>
          </div>
        </div>
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a] transition-colors font-medium">
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