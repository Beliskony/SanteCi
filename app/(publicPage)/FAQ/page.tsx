import FaqContent from "@/app/frontend/components/FAQComponents/FaqContent";

export const metadata = {
  title: "Questions fréquentes | SantéCi",
  description:
    "Retrouvez les réponses essentielles sur votre compte, l'OTP, les rendez-vous, les paiements, la téléconsultation et la confidentialité de vos données.",
};

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <FaqContent />
    </main>
  );
}