"use client";

import { useEffect, useCallback, useState } from "react";
import {
  Stethoscope, Baby, Flower2, Heart,
  Sparkles, Eye, Brain, Star,
  type LucideIcon,
} from "lucide-react";
import { useDoctorStore } from "@/app/frontend/store/otherStore";
import type { DoctorFilters } from "@/app/frontend/services/doctorService";
import { DoctorSearch } from "./DoctorSearch";
import { DoctorGrid } from "./DoctorGrid";

// ── Spécialités rapides ────────────────────────────────────────────────────────
const QUICK_SPECIALTIES: { label: string; icon: LucideIcon }[] = [
  { label: "Généraliste",   icon: Stethoscope },
  { label: "Pédiatre",      icon: Baby        },
  { label: "Gynécologue",   icon: Flower2     },
  { label: "Cardiologue",   icon: Heart       },
  { label: "Dermatologue",  icon: Sparkles    },
  { label: "Ophtalmologue", icon: Eye         },
  { label: "Psychiatre",    icon: Brain       },
  { label: "Dentiste",      icon: Star        },
];

function QuickSpecialties({
  onSelect,
  active,
}: {
  onSelect: (s: string) => void;
  active: string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {QUICK_SPECIALTIES.map(({ label, icon: Icon }) => (
        <button
          key={label}
          onClick={() => onSelect(active === label ? "" : label)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            active === label
              ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
              : "bg-white text-slate-600 border-slate-200 hover:border-[#1e3a8a] hover:text-[#1e3a8a] hover:bg-blue-50"
          }`}
        >
          <Icon size={12} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function FindDoctorPage() {
  const doctors      = useDoctorStore((s) => s.doctors);
  const isLoading    = useDoctorStore((s) => s.isLoading);
  const pagination   = useDoctorStore((s) => s.pagination);
  const fetchDoctors = useDoctorStore((s) => s.fetchDoctors);

  const [activeSpecialty, setActiveSpecialty] = useState("");

  useEffect(() => {
    fetchDoctors({ city: "Abidjan", limit: 9, page: 1 });
  }, [fetchDoctors]);

  const handleSearch = useCallback((filters: DoctorFilters) => {
    setActiveSpecialty(filters.specialty ?? "");
    fetchDoctors({ ...filters, limit: 9, page: 1 });
  }, [fetchDoctors]);

  const handleQuickSpecialty = useCallback((specialty: string) => {
    setActiveSpecialty(specialty);
    fetchDoctors({ specialty: specialty || undefined, limit: 9, page: 1 });
  }, [fetchDoctors]);

  const handleLoadMore = useCallback(() => {
    fetchDoctors({ page: (pagination.page ?? 1) + 1, limit: 9 });
  }, [fetchDoctors, pagination.page]);

  const hasMore = (pagination.page ?? 0) < (pagination.pages ?? 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">

        <div>
          <h1 className="text-xl font-bold text-slate-900">Trouver un médecin</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Consultez un spécialiste en vidéo, audio ou chat depuis chez vous.
          </p>
        </div>

        <DoctorSearch onSearch={handleSearch} isLoading={isLoading} />

        <QuickSpecialties onSelect={handleQuickSpecialty} active={activeSpecialty} />

        <DoctorGrid
          doctors={doctors}
          isLoading={isLoading}
          total={pagination.total}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}