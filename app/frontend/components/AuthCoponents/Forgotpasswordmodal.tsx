"use client";

import { useState } from "react";
import { Mail, ArrowRight, Lock, Eye, EyeOff, X, KeyRound, Loader2 } from "lucide-react";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";

type Step = "email" | "otp" | "newPassword";

interface ForgotPasswordModalProps {
  onClose: () => void;
  role?: "doctor" | "patient";
}

const ForgotPasswordModal = ({ onClose, role = "patient" }: ForgotPasswordModalProps) => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // ✅ Stocker l'OTP validé
  const [validatedOtp, setValidatedOtp] = useState<string | null>(null);

  const { forgotPassword, verifyOtp, resetPassword, isLoading } = useAuthStore();

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await forgotPassword(email, role);
      setSuccess("Un code de vérification a été envoyé à votre email.");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du code.");
    }
  };

  // ✅ Vérifier l'OTP et le stocker
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setError("Veuillez entrer les 6 chiffres du code.");
      return;
    }
    try {
      await verifyOtp(email, otpCode, role);
      // ✅ Stocker l'OTP validé
      setValidatedOtp(otpCode);
      setSuccess("Code vérifié avec succès. Vous pouvez maintenant changer votre mot de passe.");
      setStep("newPassword");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code OTP invalide ou expiré.");
    }
  };

  // ✅ Utiliser l'OTP stocké pour la réinitialisation
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    // ✅ Utiliser l'OTP validé stocké
    if (!validatedOtp) {
      setError("Le code de vérification n'a pas été validé. Veuillez recommencer.");
      return;
    }
    try {
      await resetPassword(email, validatedOtp, newPassword, role);
      setSuccess("Mot de passe réinitialisé avec succès !");
      setTimeout(() => {
        onClose();
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la réinitialisation.");
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    try {
      await forgotPassword(email, role);
      setSuccess("Un nouveau code a été envoyé à votre email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du renvoi du code.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            {success}
          </div>
        )}

        {/* Étape 1 — Email */}
        {step === "email" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center mb-2">
                <Mail size={18} className="text-[#1e3a8a]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Mot de passe oublié ?</h2>
              <p className="text-sm text-gray-500">
                Entrez votre email. Nous vous enverrons un code de vérification.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#1e3a8a] transition-colors">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <input
                  type="email"
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                  required
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#2d4fa8] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Envoi...</>
                ) : (
                  <><Mail size={16} /> Envoyer le code</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Étape 2 — OTP */}
        {step === "otp" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center mb-2">
                <KeyRound size={18} className="text-[#1e3a8a]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Vérification</h2>
              <p className="text-sm text-gray-500">
                Entrez le code à 6 chiffres envoyé à <span className="font-medium text-gray-700">{email}</span>.
              </p>
            </div>

            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-5">
              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-bold border border-gray-200 rounded-lg outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all"
                    disabled={isLoading}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={otp.join("").length < 6 || isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#2d4fa8] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Vérification...</>
                ) : (
                  <>Vérifier le code <ArrowRight size={15} /></>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400">
              Pas reçu ?{" "}
              <button
                onClick={handleResendOtp}
                className="text-[#1e3a8a] font-medium hover:underline"
                disabled={isLoading}
              >
                Renvoyer
              </button>
            </p>
          </div>
        )}

        {/* Étape 3 — Nouveau mot de passe */}
        {step === "newPassword" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center mb-2">
                <Lock size={18} className="text-[#1e3a8a]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Nouveau mot de passe</h2>
              <p className="text-sm text-gray-500">
                Choisissez un mot de passe sécurisé pour votre compte.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#1e3a8a] transition-colors">
                  <Lock size={16} className="text-gray-400 shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#1e3a8a] transition-colors">
                  <Lock size={16} className="text-gray-400 shrink-0" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                    required
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!newPassword || newPassword !== confirmPassword || isLoading || !validatedOtp}
                className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#2d4fa8] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Réinitialisation...</>
                ) : (
                  <>Réinitialiser le mot de passe <ArrowRight size={15} /></>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPasswordModal;