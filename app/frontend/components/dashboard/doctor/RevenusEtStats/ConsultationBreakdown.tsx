"use client";

interface BreakdownItem {
  label:   string;
  percent: number;
  color:   string;
}

interface ConsultationBreakdownProps {
  video?:    number; // pourcentage
  inPerson?: number;
  chat?:     number;
  audio?:    number;
  isLoading?: boolean;
}

export function ConsultationBreakdown({
  video = 0,
  inPerson = 0,
  chat = 0,
  audio = 0,
  isLoading = false,
}: ConsultationBreakdownProps) {

  const items: BreakdownItem[] = [
    { label: "Vidéo",   percent: video,    color: "bg-[#1e3a8a]" },
    { label: "Cabinet", percent: inPerson, color: "bg-emerald-500" },
    { label: "Chat",    percent: chat,     color: "bg-amber-400" },
    { label: "Audio",   percent: audio,    color: "bg-violet-500" },
  ].filter((item) => item.percent > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h2 className="text-sm font-bold text-slate-900 mb-4">Répartition des consultations</h2>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune donnée disponible</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">{item.label}</span>
                <span className="text-xs font-bold text-slate-900">{item.percent}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}