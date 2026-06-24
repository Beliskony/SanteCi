"use client";

export interface RecentPayment {
  _id:     string;
  method:  string; // "Orange Money", "Carte bancaire"...
  amount:  number;
  time:    string; // "Aujourd'hui • 14:02"
  status:  "validated" | "pending" | "failed";
}

const STATUS_LABEL: Record<RecentPayment["status"], { label: string; style: string }> = {
  validated: { label: "Validé",  style: "text-emerald-600" },
  pending:   { label: "En attente", style: "text-amber-600" },
  failed:    { label: "Échoué", style: "text-red-500" },
};

interface RecentPaymentsProps {
  payments?: RecentPayment[];
  isLoading?: boolean;
}

export function RecentPayments({ payments = [], isLoading = false }: RecentPaymentsProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h2 className="text-sm font-bold text-slate-900 mb-4">Paiements récents</h2>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <p className="text-sm text-slate-400">Aucun paiement récent</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-50">
          {payments.map((p) => (
            <div key={p._id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{p.method}</p>
                <p className="text-xs text-slate-400">{p.time}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  {p.amount.toLocaleString("fr-FR")}
                </p>
                <p className={`text-xs font-semibold ${STATUS_LABEL[p.status].style}`}>
                  {STATUS_LABEL[p.status].label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}