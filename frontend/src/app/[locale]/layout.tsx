import "@/app/globals.css";
import React from "react";
import { Inter } from 'next/font/google'
import CookieBanner from "@/components/cookie-banner/CookieBanner";
import TranslationsProvider from "@/components/TranslationProvider";
import initTranslations from "@/app/i18n";
import {ToastProvider} from "@/components/ui/Toast";

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

export default async function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const { resources } = await initTranslations(locale);

  return (
    // TranslationsProvider is a server component designed for root-level wrapping.
    <TranslationsProvider
      locale={locale}
      resources={resources}>
      <html lang="en" className={`${inter.className} h-full`}>
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
  );
}