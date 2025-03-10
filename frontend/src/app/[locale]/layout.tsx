import "@/app/globals.css";
import React from "react";
import { Inter } from 'next/font/google'
import CookieBanner from "@/components/cookie-banner/CookieBanner";
import TranslationsProvider from "@/components/TranslationProvider";
import initTranslations from "@/app/i18n";
import { ToastProvider } from "@/components/ui/Toast";
import { UserProvider } from "@/components/UserContext";
import { getUserId } from "@/utils/dal";

// Inter as default font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

// Metadata for improved SEO and web shareability
export const metadata: { description: string; title: string } = {
  title: "VTK Burgieclan",
  description: "Vlaamse Technische Kring Leuven Burgieclan",
};

export default async function RootLayout({ children, params: { locale }, }: Readonly<{ children: React.ReactNode; params: { locale: string }; }>) {
  const [translations, userId] = await Promise.all([
    initTranslations(locale),
    getUserId()
  ]);
  const { resources } = translations;

  return (
    // UserProvider and TranslationsProvider are server components designed for root-level wrapping.
    <UserProvider userId={userId}>
      <TranslationsProvider
        locale={locale}
        resources={resources}>
        <html lang={locale} className={`${inter.className} h-full`}>
          <body className="flex min-h-full">
            {/* ToastProvider uses client-side hooks (useState, useContext) so must be placed inside body tags */}
            <ToastProvider>
              <div className="w-full">
                {children}
                <CookieBanner />
              </div>
            </ToastProvider>
          </body>
        </html>
      </TranslationsProvider>
    </UserProvider>
  );
}