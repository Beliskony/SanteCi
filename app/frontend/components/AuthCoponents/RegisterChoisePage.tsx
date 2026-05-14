"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Stethoscope, Check, Heart } from "lucide-react";

const PATIENT_FEATURES = [
  "Recherche de spécialistes",
  "Prise de rendez-vous en ligne",
  "Téléconsultation",
];

const DOCTOR_FEATURES = [
  "Agenda connecté",
  "Outil de téléconsultation",
  "Visibilité accrue",
];

const RegisterChoicePage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center px-4 py-12">

      {/* ── En-tête ── */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-[#1e3a8a] flex items-center justify-center shadow-md">
          <Heart size={22} stroke="white" fill="white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenue sur SanteCi
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            Pour commencer, veuillez nous indiquer comment vous souhaitez
            utiliser la plateforme.
          </p>
        </div>
      </div>

      {/* ── Cartes ── */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">

        {/* Patient */}
        <div className="flex-1 bg-white rounded-2xl p-7 flex flex-col gap-5 shadow-sm border border-gray-100">
          {/* Icône */}
          <div className="w-14 h-14 rounded-full p-4 bg-blue-50 flex items-center justify-center">
            <User size={25} className="text-[#1e3a8a]" />
          </div>

          {/* Texte */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-bold text-gray-900">Je suis patient</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Trouvez un médecin, prenez rendez-vous, consultez en vidéo et
              gérez votre dossier médical de manière sécurisée.
            </p>
          </div>

          {/* Features */}
          <ul className="flex flex-col gap-2">
            {PATIENT_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check size={15} className="text-[#1e3a8a] shrink-0" strokeWidth={2.5} />
                <span className="text-sm text-gray-600">{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={() => router.push("/register/patient")}
            className="mt-auto w-full bg-[#1e3a8a] hover:bg-[#2d4fa8] text-white text-sm font-semibold py-3 rounded-xl transition-colors duration-200"
          >
            Créer un compte patient
          </button>
        </div>

        {/* Médecin */}
        <div className="flex-1 bg-white rounded-2xl p-7 flex flex-col gap-5 shadow-sm border border-gray-100 relative overflow-hidden">
          {/* Cercle décoratif (visible sur la capture) */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-50 opacity-60 pointer-events-none" />

          {/* Icône */}
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            <Stethoscope size={25} className="text-[#1e3a8a]" />
          </div>

          {/* Texte */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-bold text-gray-900">
              Je suis professionnel
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Gérez vos rendez-vous, développez votre patientèle, proposez la
              téléconsultation et simplifiez votre quotidien.
            </p>
          </div>

          {/* Features */}
          <ul className="flex flex-col gap-2">
            {DOCTOR_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check size={15} className="text-[#1e3a8a] shrink-0" strokeWidth={2.5} />
                <span className="text-sm text-gray-600">{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={() => router.push("/register/doctor")}
            className="mt-auto w-full border border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 text-sm font-semibold py-3 rounded-xl transition-colors duration-200"
          >
            S'inscrire comme médecin
          </button>
        </div>
      </div>

      {/* ── Lien connexion ── */}
      <p className="mt-8 text-sm text-gray-500">
        Vous avez déjà un compte ?{" "}
        <Link
          href="/login"
          className="text-[#1e3a8a] font-semibold hover:text-[#2d4fa8] transition-colors"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
};

export default RegisterChoicePage;