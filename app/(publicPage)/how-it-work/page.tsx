import HeroSection from "@/app/frontend/components/commentSaMarcheComponents/ComHeroSection";
import StepsStepper from "@/app/frontend/components/commentSaMarcheComponents/StepStepper";
import ProcessSection from "@/app/frontend/components/commentSaMarcheComponents/ProcessSection";
import UseCasesSection from "@/app/frontend/components/commentSaMarcheComponents/UseCasesSection";

export const metadata = {
  title: "Comment ça marche ? | SantéCi",
  description:
    "Découvrez comment fonctionne SantéCi : recherchez un médecin, consultez en vidéo et récupérez vos ordonnances en quelques étapes simples.",
};

export default function CommentCaMarchePage() {
  return (
    <main>
      <HeroSection />
      <StepsStepper />
      <ProcessSection />
      <UseCasesSection />
    </main>
  );
}