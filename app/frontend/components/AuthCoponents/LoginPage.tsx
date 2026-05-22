"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Stethoscope, Heart, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ForgotPasswordModal from "./Forgotpasswordmodal";
import { authService } from "@/app/frontend/services/authService";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";

type Role = "patient" | "doctor";

const LoginPage = () => {
  const router = useRouter();

  // ── Store ────────────────────────────────────────────────────
  const { isLoading, error } = useAuthStore();  
  // isLoading et error viennent du store — authService les met à jour

  // ── État local UI ────────────────────────────────────────────
  const [role, setRole] = useState<Role>("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [form, setForm] = useState({ identifier: "", password: "" });

  // ── Changement de rôle — reset du formulaire et des erreurs ──
  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setForm({ identifier: "", password: "" });
  };

  // ── Soumission ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await authService.login({ identifiantLogin: form.identifier, password: form.password, role });
    await authService.refreshUser(); // ← fetch le profil complet
    router.push(role === "doctor" ? "/doctor" : "/patient");

    } catch {
      // L'erreur est déjà dans le store via authService → setError()
      // Pas besoin de la gérer ici
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Colonne gauche — formulaire ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 py-12 bg-white">
        <div className="w-full max-w-sm flex flex-col gap-7">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1e3a8a] flex items-center justify-center">
              <Heart size={22} stroke="white" fill="white" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-bold text-gray-900">Bon retour sur SanteCi</h1>
              <p className="text-sm text-gray-500 text-center">
                Connectez-vous pour accéder à votre espace de santé.
              </p>
            </div>
          </div>

          {/* Toggle Patient / Professionnel */}
          <div className="flex rounded-xl border border-gray-200 p-1 bg-[#e2e8f0]">
            <button
              onClick={() => handleRoleChange("patient")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                role === "patient"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <User size={15} />
              Patient
            </button>
            <button
              onClick={() => handleRoleChange("doctor")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                role === "doctor"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Stethoscope size={15} />
              Professionnel
            </button>
          </div>

          {/* Bannière d'erreur */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Email / Téléphone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Email ou Numéro de téléphone
              </label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#1e3a8a] transition-colors">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="exemple@email.com ou 07 00 00 00 00"
                  value={form.identifier}
                  onChange={(e) => {
                    setForm({ ...form, identifier: e.target.value });
                  }}
                  className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 bg-transparent"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Mot de passe</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-[#1e3a8a] hover:text-[#3742fa] transition-colors font-medium"
                >
                  Oublié ?
                </button>
              </div>
              <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#1e3a8a] transition-colors">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                  }}
                  className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 bg-transparent"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword
                    ? <EyeOff size={16} className="text-gray-400" />
                    : <Eye size={16} className="text-gray-400" />
                  }
                </button>
              </div>
            </div>

            {/* Se souvenir de moi */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#1e3a8a]"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-600">Se souvenir de moi</span>
            </label>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#3742fa] disabled:bg-[#1e3a8a]/60 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-lg transition-colors duration-200"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Lien inscription */}
          <p className="text-center text-sm text-gray-500">
            Nouveau sur SanteCi ?{" "}
            <Link href="/register" className="text-[#1e3a8a] font-semibold hover:text-[#3742fa] transition-colors">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>

      {/* ── Colonne droite — branding ── */}
      <div className="hidden lg:flex w-1/2 bg-[#1e3a8a] flex-col justify-center items-center px-12 gap-10">
        <div className="flex flex-col items-center text-center gap-6 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Shield size={26} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white leading-snug">
            Votre santé, sécurisée et à portée de main.
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Accédez à votre dossier médical, prenez rendez-vous avec des milliers de professionnels
            de santé et consultez en vidéo en toute confidentialité.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {[
            { icon: <Heart size={18} />, title: "Téléconsultation", desc: "Consultez d'où vous voulez, quand vous voulez." },
            { icon: <Shield size={18} />, title: "Dossier sécurisé", desc: "Vos données protégées et accessibles 24/7." },
          ].map((f, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-4 flex flex-col gap-2">
              <div className="text-white">{f.icon}</div>
              <span className="text-sm font-semibold text-white">{f.title}</span>
              <span className="text-xs text-white/60 leading-relaxed">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal mot de passe oublié */}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
};

export default LoginPage;