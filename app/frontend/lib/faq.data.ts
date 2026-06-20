import { UserIcon, ShieldIcon, CalendarIcon, CreditCardIcon, LockIcon, StethoscopeIcon } from "lucide-react";
import { ElementType } from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  icon: ElementType;
  description: string;
  items: FaqItem[];
}

export const faqCategories: FaqCategory[] = [
  {
    id: "compte",
    label: "Compte & Connexion",
    icon: UserIcon,
    description: "Créer votre espace patient et accéder à la plateforme",
    items: [
      {
        question: "Comment créer un compte sur SantéCi ?",
        answer:
          "Rendez-vous sur la page d'inscription, renseignez votre nom, prénom, numéro de téléphone et une adresse e-mail. Confirmez votre identité via le code OTP reçu par SMS, et votre espace patient est prêt à l'emploi.",
      },
      {
        question: "Puis-je me connecter avec mon numéro de téléphone ?",
        answer:
          "Oui. Votre numéro de téléphone est votre identifiant principal sur SantéCi. À chaque connexion, un code OTP vous est envoyé par SMS pour sécuriser l'accès à votre espace.",
      },
      {
        question: "J'ai oublié mon mot de passe, que faire ?",
        answer:
          "Depuis la page de connexion, cliquez sur « Mot de passe oublié », saisissez votre numéro de téléphone ou votre e-mail et suivez les instructions reçues pour réinitialiser votre accès.",
      },
    ],
  },
  {
    id: "consultation",
    label: "Consultation en ligne",
    icon: StethoscopeIcon,
    description: "Déroulé d'une séance, ordonnance et suivi",
    items: [
      {
        question: "Comment se déroule une consultation sur SantéCi ?",
        answer:
          "Vous choisissez un médecin disponible, vous réglez les frais de consultation via Wave, puis vous rejoignez la session en vidéo depuis votre espace patient. Le médecin écoute vos symptômes, vous pose des questions et établit son diagnostic à la fin de la séance.",
      },
      {
        question: "Est-ce que le médecin peut me délivrer une ordonnance ?",
        answer:
          "Oui. Si la consultation le justifie, le médecin génère une ordonnance numérique au format PDF directement dans votre espace. Elle contient vos informations personnelles (nom, groupe sanguin), le diagnostic, les médicaments prescrits ainsi que les dosages et la durée du traitement.",
      },
      {
        question: "Le médecin peut-il m'orienter vers un hôpital ?",
        answer:
          "Absolument. Si votre état nécessite des examens complémentaires, une hospitalisation ou une prise en charge physique urgente, le médecin peut vous délivrer un bon d'orientation vers un établissement hospitalier adapté. Cette décision est prise selon les résultats cliniques constatés lors de la consultation.",
      },
      {
        question: "Où puis-je retrouver mon ordonnance après la consultation ?",
        answer:
          "Votre ordonnance est automatiquement déposée dans votre espace patient sous « Mes documents ». Vous pouvez la télécharger en PDF, la transmettre à votre pharmacien ou la présenter à l'hôpital si nécessaire.",
      },
      {
        question: "Que se passe-t-il si la connexion coupe pendant ma consultation ?",
        answer:
          "La session est conçue pour résister aux coupures courtes. Si la déconnexion dure plus de quelques minutes, vous pouvez rejoindre la consultation via le même lien dans votre espace. En cas d'impossibilité, le médecin peut vous proposer un nouveau créneau sans frais supplémentaires.",
      },
    ],
  },
  {
    id: "rendezvous",
    label: "Rendez-vous",
    icon: CalendarIcon,
    description: "Réservation, annulation et reprogrammation",
    items: [
      {
        question: "Comment prendre rendez-vous avec un médecin ?",
        answer:
          "Depuis la page des médecins, filtrez par spécialité ou disponibilité, consultez le profil du praticien et sélectionnez un créneau libre. Décrivez brièvement votre motif de consultation, puis procédez au paiement via Wave pour confirmer le rendez-vous.",
      },
      {
        question: "SantéCi couvre-t-il toute la Côte d'Ivoire ?",
        answer:
          "Pour le moment, SantéCi est disponible uniquement sur Abidjan. Nous travaillons à étendre notre couverture à d'autres villes du pays prochainement.",
      },
      {
        question: "Puis-je annuler ou reprogrammer un rendez-vous ?",
        answer:
          "Oui, depuis la rubrique « Mes rendez-vous », vous pouvez annuler ou modifier un créneau au moins 2 heures avant la consultation. Passé ce délai, les frais peuvent rester acquis selon les conditions du médecin.",
      },
    ],
  },
  {
    id: "paiements",
    label: "Paiements",
    icon: CreditCardIcon,
    description: "Frais de consultation et paiement via Wave",
    items: [
      {
        question: "Comment se passe le paiement sur SantéCi ?",
        answer:
          "Le paiement se fait exclusivement via Wave, l'application de mobile money disponible en Côte d'Ivoire. Lors de la confirmation de votre rendez-vous, vous recevez une demande de paiement Wave que vous validez en quelques secondes depuis votre téléphone.",
      },
      {
        question: "Combien coûte une consultation ?",
        answer:
          "Le tarif varie selon la spécialité et le médecin choisi. Le montant est clairement affiché sur le profil du médecin avant toute réservation. Aucun frais caché n'est appliqué.",
      },
      {
        question: "Suis-je remboursé si la consultation n'a pas lieu ?",
        answer:
          "Si la consultation est annulée à l'initiative du médecin ou en cas de problème technique avéré côté plateforme, vous êtes intégralement remboursé sur votre compte Wave dans un délai de 24 à 48 heures.",
      },
      {
        question: "Mon paiement Wave est-il sécurisé ?",
        answer:
          "Oui. Les transactions sont traitées directement par Wave via leur infrastructure sécurisée. SantéCi ne stocke aucune donnée financière vous concernant.",
      },
    ],
  },
  {
    id: "otp",
    label: "OTP & Sécurité",
    icon: ShieldIcon,
    description: "Validation du compte et protection de votre accès",
    items: [
      {
        question: "À quoi sert le code OTP ?",
        answer:
          "Le code OTP (mot de passe à usage unique) est envoyé par SMS à votre numéro de téléphone. Il sert à vérifier votre identité lors de la création de compte, de la connexion ou de toute action sensible sur la plateforme.",
      },
      {
        question: "Combien de temps est valide mon code OTP ?",
        answer:
          "Le code OTP est valable 10 minutes après réception. Au-delà, vous devrez en demander un nouveau depuis la même page.",
      },
      {
        question: "Je n'ai pas reçu mon code OTP, que faire ?",
        answer:
          "Vérifiez que votre numéro de téléphone est correct et que vous avez du réseau. Si le code n'arrive pas au bout de quelques minutes, cliquez sur « Renvoyer le code ». Toujours rien ? Contactez notre support.",
      },
    ],
  },
  {
    id: "confidentialite",
    label: "Confidentialité",
    icon: LockIcon,
    description: "Protection de vos données médicales et personnelles",
    items: [
      {
        question: "Mes données médicales sont-elles confidentielles ?",
        answer:
          "Oui. Vos informations personnelles et médicales (compte-rendu, ordonnance, historique) sont chiffrées et uniquement accessibles à vous et au médecin que vous avez consulté. Aucun tiers n'y a accès.",
      },
      {
        question: "Qui peut voir mon ordonnance numérique ?",
        answer:
          "Seul vous pouvez accéder à votre ordonnance depuis votre espace patient. Vous êtes libre de la partager avec votre pharmacien ou un établissement hospitalier selon vos besoins.",
      },
      {
        question: "Puis-je demander la suppression de mon compte et de mes données ?",
        answer:
          "Oui. Depuis vos paramètres, vous pouvez soumettre une demande de suppression complète de votre compte. Vos données personnelles et médicales seront effacées dans un délai de 30 jours, conformément à notre politique de confidentialité.",
      },
    ],
  },
];