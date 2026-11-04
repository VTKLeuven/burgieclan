import { canAccessAdmin, getUserId } from "@/actions/auth";
import "@/app/globals.css";
import initTranslations from "@/app/i18n";
import CookieBanner from "@/components/cookie-banner/CookieBanner";
import TranslationsProvider from "@/components/TranslationProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { UserProvider } from "@/components/UserContext";
import type { Metadata } from "next";
import { Figtree, Roboto } from 'next/font/google';
import React from "react";

// The wireframes pair a geometric display face (Circular in Figma; Figtree is the closest open
// match) for headings and navigation with Roboto for body copy. Both are exposed as CSS variables
// that globals.css maps onto Tailwind's font-sans and font-display.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-body',
})

const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
})

// Metadata for improved SEO and web shareability
export const metadata: Metadata = {
  title: "VTK Burgieclan",
  description: "Vlaamse Technische Kring Leuven Burgieclan",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

type Params = Promise<{ locale: string }>;

export default async function RootLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Params; }>) {
  const { locale } = await params;

  const [translations, userId, isAdmin] = await Promise.all([
    initTranslations(locale),
    getUserId(),
    canAccessAdmin()
  ]);
  const { resources } = translations;

  return (
    // UserProvider and TranslationsProvider are server components designed for root-level wrapping.
    <UserProvider userId={userId} isAdmin={isAdmin}>
      <TranslationsProvider
        locale={locale}
        resources={resources}>
        <html lang={locale} className={`${roboto.variable} ${figtree.variable} h-full`}>
          <body className="flex min-h-full flex-col">
            {/* ToastProvider uses client-side hooks (useState, useContext) so must be placed inside body tags */}
            <ToastProvider>
              <div className="flex min-h-full w-full flex-1 flex-col">
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