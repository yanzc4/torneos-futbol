import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Trophy } from "lucide-react";

import TourGuide from "@/components/TourGuide";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tus-torneos.vercel.app"),
  title: {
    template: "%s | Torneos E-Football",
    default: "Crear Torneos de E-Football, PES, FIFA, FC 24 | Gratis",
  },
  description: "Crea y gestiona torneos de E-Football, PES y FIFA gratis. Genera fixtures, tablas de posiciones, llaves eliminatorias y Sistema Suizo al instante.",
  keywords: ["torneos e-football", "crear torneos fifa", "organizar torneos pes", "generador de fixture", "creador de ligas", "brackets eliminatorios"],
  authors: [{ name: "codemultiall" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Torneos E-Football - Crea tu competición",
    description: "Crea torneos de e-sports y fútbol virtual gratis. Genera tablas y llaves automáticamente.",
    url: "/",
    siteName: "Torneos E-Football",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Torneos E-Football Banner",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Torneos E-Football - Crea tu competición",
    description: "Crea torneos de e-sports y fútbol virtual gratis. Genera tablas y llaves automáticamente.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/logo.webp",
    shortcut: "/logo.webp",
    apple: "/logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} antialiased text-white min-h-screen flex flex-col`}>
        <nav className="sticky top-0 z-50 glass-panel border-b-0 rounded-none border-x-0 !bg-black/20 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tighter">
            <Trophy className="w-6 h-6 text-neon" />
            <span>E-FOOT<span className="text-neon">BALL</span></span>
          </Link>
          <div className="flex items-center gap-6">
            <TourGuide />
            <Link href="/crear" className="tour-create-btn text-sm font-semibold hover:text-neon transition-colors">
              Crear Torneo
            </Link>
          </div>
        </nav>
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
