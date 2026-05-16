import { Search, Calendar, Video, FileText } from "lucide-react"

const steps = [
  {
    number: 1,
    icon: Search,
    title: "Choisissez un médecin",
    description: "Recherchez le professionnel de santé dont vous avez besoin par spécialité.",
  },
  {
    number: 2,
    icon: Calendar,
    title: "Réservez un créneau",
    description: "Sélectionnez l'heure qui vous convient et payez votre consultation de manière sécurisée.",
  },
  {
    number: 3,
    icon: Video,
    title: "Consultez en vidéo",
    description: "Connectez-vous à l'heure prévue depuis l'application pour échanger avec le médecin.",
  },
  {
    number: 4,
    icon: FileText,
    title: "Recevez vos documents",
    description: "Retrouvez instantanément votre ordonnance ou certificat dans votre espace personnel.",
  },
]

const HowItWork = () => {
  return (
    <section className="bg-white py-16 px-6 my-7">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          Comment ça marche ?
        </h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
          Un parcours fluide en 4 étapes simples pour une consultation médicale à distance réussie.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {steps.map(({ number, icon: Icon, title, description }) => (
          <div
            key={number}
            className="relative bg-slate-50 border border-slate-200 rounded-2xl px-6 pt-10 pb-7 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
          >
            {/* Step badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
              {number}
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <Icon size={28} className="text-blue-900" strokeWidth={1.5} />
            </div>

            {/* Title */}
            <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">
              {title}
            </h3>

            {/* Description */}
            <p className="text-xs text-slate-500 leading-relaxed">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HowItWork