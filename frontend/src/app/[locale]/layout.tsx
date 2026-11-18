import { canAccessAdmin, getUserId } from "@/actions/auth";
import { getFeatures } from "@/actions/features";
import "@/app/globals.css";
import initTranslations from "@/app/i18n";
import CookieBanner from "@/components/cookie-banner/CookieBanner";
import { FeaturesProvider } from "@/components/FeaturesContext";
import TranslationsProvider from "@/components/TranslationProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { UserProvider } from "@/components/UserContext";
import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import React from "react";

// Inter as default font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

// Metadata for improved SEO and web shareability
export const metadata: Metadata = {
  title: "VTK Burgieclan",
  description: "Vlaamse Technische Kring Leuven Burgieclan",
  icons: {
    icon: [
      { url: "/images/logos/burgieclan-icon-circle.svg?v=3", type: "image/svg+xml" },
      { url: "/icon.png?v=3", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico?v=3", sizes: "48x48" },
    ],
    apple: "/apple-icon.png?v=3",
  },
};

type Params = Promise<{ locale: string }>;

export default async function RootLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Params; }>) {
  const { locale } = await params;

  const [translations, userId, isAdmin, features] = await Promise.all([
    initTranslations(locale),
    getUserId(),
    canAccessAdmin(),
    getFeatures(),
  ]);
  const { resources } = translations;

  return (
    // UserProvider and TranslationsProvider are server components designed for root-level wrapping.
    <UserProvider userId={userId} isAdmin={isAdmin}>
      <TranslationsProvider
        locale={locale}
        resources={resources}>
        <html lang={locale} className={`${inter.className} h-full`}>
          <body className="flex min-h-full flex-col">
            {/* ToastProvider uses client-side hooks (useState, useContext) so must be placed inside body tags */}
            <ToastProvider>
              <FeaturesProvider features={features}>
                <div className="flex min-h-full w-full flex-1 flex-col">
                  {children}
                  <CookieBanner />
                </div>
              </FeaturesProvider>
            </ToastProvider>
          </body>
        </html>
      </TranslationsProvider>
    </UserProvider>
  );
}