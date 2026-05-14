"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Search,
  Video,
  FolderOpen,
} from "lucide-react";
import { authService } from "@/app/frontend/services/authService";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";

const ADVANTAGES = [
  {
    icon: <Search size={18} className="text-[#1e3a8a]" />,
    title: "Recherche simplifiée",
    desc: "Trouvez le bon médecin selon la spécialité et vos disponibilités.",
  },
  {
    icon: <Video size={18} className="text-[#1e3a8a]" />,
    title: "Téléconsultation",
    desc: "Consultez en vidéo de manière sécurisée et recevez vos ordonnances.",
  },
  {
    icon: <FolderOpen size={18} className="text-[#1e3a8a]" />,
    title: "Dossier centralisé",
    desc: "Retrouvez tout votre historique médical au même endroit.",
  },
];

const RegisterPatientPage = () => {
  const router = useRouter();
  const { isLoading, error, setError } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptHealth, setAcceptHealth] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    city: "",
    password: "",
  });

  const setField = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (error) setError(null);
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) return;
    try {
      await authService.register({
        role: "patient",
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: `+225${form.phone.replace(/\s/g, "")}`,
        gender: form.gender as "male" | "female" | "other",
        dateOfBirth: form.dateOfBirth,
        password: form.password,
      });
      router.push("/dashboard/patient");
    } catch {
      // erreur gérée dans le store via authService
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col">

      {/* ── Stepper ── */}
      <div className="bg-white border-b border-gray-100 px-8 py-3 flex items-center">
        <span className="text-sm font-semibold text-[#1e3a8a]">
          Inscription Patient
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {["Informations", "Vérification", "Confirmation"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? "bg-[#1e3a8a] text-white" : "bg-gray-200 text-gray-400"
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${
                i === 0 ? "text-[#1e3a8a] font-medium" : "text-gray-400"
              }`}>
                {step}
              </span>
              {i < 2 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="flex flex-1">

        {/* ── Colonne formulaire (2/3) ── */}
        <div className="w-full lg:w-2/3 bg-white flex justify-center overflow-y-auto">
          <div className="w-full max-w-lg px-10 py-12">

            {/* Retour */}
            <button
              onClick={() => router.push("/register")}
              className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-500 hover:text-gray-700 mb-8 transition-colors"
            >
              <ArrowLeft size={15} />
              Retour au choix
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Créer un compte Patient
            </h1>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Remplissez ce formulaire pour accéder à la prise de rendez-vous
              et à votre dossier médical.
            </p>

            {/* Bannière erreur */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-6">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Prénom + Nom */}
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Prénom</label>
                  <input
                    type="text"
                    placeholder="Marie"
                    value={form.firstName}
                    onChange={setField("firstName")}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1e3a8a] transition-colors w-full"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Nom</label>
                  <input
                    type="text"
                    placeholder="Lambert"
                    value={form.lastName}
                    onChange={setField("lastName")}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1e3a8a] transition-colors w-full"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  placeholder="marie.lambert@email.com"
                  value={form.email}
                  onChange={setField("email")}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1e3a8a] transition-colors w-full"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Téléphone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Numéro de téléphone
                </label>
                <div className="flex gap-2">
                  <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-500 bg-gray-50 shrink-0 select-none">
                    +225
                  </div>
                  <input
                    type="tel"
                    placeholder="07 00 00 00 00"
                    value={form.phone}
                    onChange={setField("phone")}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1e3a8a] transition-colors"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Genre + Date de naissance */}
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Genre</label>
                  <select
                    value={form.gender}
                    onChange={setField("gender")}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1e3a8a] transition-colors bg-white w-full"
                    required
                    disabled={isLoading}
                  >
                    <option value="" disabled>Choisir</option>
                    <option value="female">Femme</option>
                    <option value="male">Homme</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={setField("dateOfBirth")}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1e3a8a] transition-colors w-full"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Ville */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Ville</label>
                <input
                  type="text"
                  placeholder="Abidjan"
                  value={form.city}
                  onChange={setField("city")}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1e3a8a] transition-colors w-full"
                  disabled={isLoading}
                />
              </div>

              {/* Mot de passe */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#1e3a8a] transition-colors">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={setField("password")}
                    className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 bg-transparent"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword
                      ? <EyeOff size={16} className="text-gray-400" />
                      : <Eye size={16} className="text-gray-400" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Au moins 8 caractères, incluant une majuscule et un chiffre.
                </p>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#1e3a8a] shrink-0"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    J'accepte les{" "}
                    <Link href="/terms" className="text-[#1e3a8a] font-medium hover:underline">
                      Conditions d'utilisation
                    </Link>{" "}
                    et la{" "}
                    <Link href="/privacy" className="text-[#1e3a8a] font-medium hover:underline">
                      Politique de confidentialité
                    </Link>{" "}
                    de SanteCI.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptHealth}
                    onChange={(e) => setAcceptHealth(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#1e3a8a] shrink-0"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    Je consens au traitement de mes données de santé à des fins
                    de téléconsultation.
                  </span>
                </label>
              </div>

              {/* Bouton submit */}
              <button
                type="submit"
                disabled={isLoading || !acceptTerms}
                className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#2d4fa8] disabled:bg-[#1e3a8a]/50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3.5 rounded-xl transition-colors duration-200 mt-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Création en cours...
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-8">
              Vous avez déjà un compte ?{" "}
              <Link
                href="/login"
                className="text-[#1e3a8a] font-semibold hover:text-[#2d4fa8] transition-colors"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        {/* ── Colonne avantages (1/3) ── */}
        <div className="hidden lg:flex flex-col justify-center w-1/3 bg-[#f4f6fb] px-14 py-12 gap-10">

          <div className="w-12 h-12 rounded-2xl bg-[#1e3a8a] flex items-center justify-center shadow-md">
            <Heart size={22} stroke="white" fill="white" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Vos avantages Patient
            </h2>
          </div>

          <div className="flex flex-col gap-8">
            {ADVANTAGES.map((a) => (
              <div key={a.title} className="flex gap-4 items-start">
                <div className="mt-0.5 shrink-0">{a.icon}</div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-gray-800">
                    {a.title}
                  </span>
                  <span className="text-xs text-gray-500 leading-relaxed">
                    {a.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterPatientPage;