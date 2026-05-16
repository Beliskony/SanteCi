import type { DoctorUser } from "@/app/frontend/store/useAuthStore"

interface FormationsDiplomesProps {
  professional: DoctorUser["professional"]
}

export default function FormationsDiplomes({ professional }: FormationsDiplomesProps) {
  const { certifications, university, graduationYear } = professional

  // On injecte le diplôme de base (université + année) en tête de liste
  const allItems = [
    ...(university
      ? [{ name: "Diplôme de Docteur en Médecine", issuer: university, year: graduationYear }]
      : []),
    ...certifications,
  ]

  if (allItems.length === 0) return null

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 mb-5">
        Formations &amp; Diplômes
      </h2>

      <ul className="flex flex-col gap-4">
        {allItems.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            {/* Bullet */}
            <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-900 shrink-0" />

            <div>
              <p className="text-sm font-semibold text-slate-900">{item.name}</p>
              <p className="text-xs text-blue-900 mt-0.5">
                {item.issuer}
                {item.year ? ` (${item.year})` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}