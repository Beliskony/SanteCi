import { Star, Quote } from "lucide-react";

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex flex-row gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-yellow-200"}
      />
    ))}
  </div>
);

const Testimonial = () => {
  return (
    <section className="bg-white w-full px-6 md:px-12 lg:px-20 py-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-center">

        {/* ── Gauche ── */}
        <div className="flex flex-col gap-8 md:w-1/2">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Ce que disent nos patients
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
              La satisfaction de nos patients est notre priorité. Découvrez
              comment SanteCi a simplifié leur accès aux soins.
            </p>
          </div>

          {/* Avatars + note */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {["/HeroSection/avatar1.jpg", "/HeroSection/avatar2.jpg", "/HeroSection/avatar3.jpg"].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="Patient"
                  className="w-10 h-10 rounded-full border-2 border-white object-cover"
                />
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              <StarRating rating={5} />
              <span className="text-sm font-medium text-gray-700">4.8/5 sur 2 450 avis</span>
            </div>
          </div>
        </div>

        {/* ── Droite — une seule card ── */}
        <div className="md:w-1/2 bg-gray-100 rounded-xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <StarRating rating={5} />
            <Quote size={28} className="text-gray-300 fill-gray-300 rotate-180" />
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">
            J'ai pu trouver un pédiatre pour mon fils un dimanche en moins de
            10 minutes. La téléconsultation s'est très bien passée et j'ai reçu
            l'ordonnance directement sur mon téléphone.
          </p>

          <div className="flex items-center gap-3">
            <img
              src="/HeroSection/avatar2.jpg"
              alt="Awa T."
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-gray-900">Awa T.</span>
              <span className="text-xs text-gray-400">Patient vérifié</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Testimonial;