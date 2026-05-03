import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./frontend/components/layouts/AppShell";

export const metadata: Metadata = {
  title: "SanteMedCI - Votre santé, notre priorité",
  description: "SanteMedCI est la plateforme de référence pour la mise en relation et la téléconsultation médicale en Côte d'Ivoire. Simple, rapide et sécurisé.",
  keywords: ["santé", "téléconsultation", "médecins", "hôpitaux", "Côte d'Ivoire"],
  authors: [{ name: "SanteMedCI Team", url: "https://santemedi.ci" }],
  openGraph: {
    title: "SanteMedCI - Votre santé, notre priorité",
    description: "SanteMedCI est la plateforme de référence pour la mise en relation et la téléconsultation médicale en Côte d'Ivoire. Simple, rapide et sécurisé.",
    url: "https://santemedi.ci",
    siteName: "SanteMedCI",
    images: [
      {
        url: "https://santemedi.ci/og-image.png",
        width: 1200,
        height: 630,
        alt: "SanteMedCI - Votre santé, notre priorité",
      },
    ],
    locale: "fr_FR",
    type: "website",
   },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" >
      <body className="min-h-full flex flex-col">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
