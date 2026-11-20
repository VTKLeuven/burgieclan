import { canAccessAdmin, getUserId } from "@/lib/auth.server";
import { getFeatures } from "@/actions/features";
import { seedApi } from "@/lib/seedApi.server";
import "@/app/globals.css";
import initTranslations from "@/app/i18n";
import CookieBanner from "@/components/cookie-banner/CookieBanner";
import { FeaturesProvider } from "@/components/FeaturesContext";
import TranslationsProvider from "@/components/TranslationProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { parseThemePreference, themeScript } from "@/components/theme/themePreference";
import { ToastProvider } from "@/components/ui/Toast";
import { UserProvider } from "@/components/UserContext";
import { COOKIE_NAMES } from "@/utils/cookieNames";
import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import { cookies } from "next/headers";
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

  // The signed-in reader is fetched here rather than after hydration: drawn without them, every
  // page load first showed the logged-out shell (no search, no "Mijn vakken", a login button)
  // and then swapped it for the real one.
  const userId = await getUserId();
  const userEndpoint = userId !== null ? `/api/users/${userId}` : null;

  const [translations, isAdmin, features, cookieStore, userSeed] = await Promise.all([
    initTranslations(locale),
    canAccessAdmin(),
    getFeatures(),
    cookies(),
    seedApi([userEndpoint]),
  ]);
  const { resources } = translations;
  const initialUser = userEndpoint ? userSeed.values[userEndpoint] ?? null : null;
  const theme = parseThemePreference(cookieStore.get(COOKIE_NAMES.THEME)?.value);

  return (
    // UserProvider and TranslationsProvider are server components designed for root-level wrapping.
    <UserProvider userId={userId} isAdmin={isAdmin} initialUser={initialUser}>
      <TranslationsProvider
        locale={locale}
        resources={resources}>
        {/* A chosen dark theme is rendered by the server; "system" is settled by the script in
            <head> before the first paint, which is why <html> may differ from what was sent. */}
        <html
          lang={locale}
          className={`${inter.className} h-full${theme === 'dark' ? ' dark' : ''}`}
          suppressHydrationWarning
        >
          <head>
            <script dangerouslySetInnerHTML={{ __html: themeScript(theme) }} />
          </head>
          <body className="flex min-h-full flex-col">
            {/* ToastProvider uses client-side hooks (useState, useContext) so must be placed inside body tags */}
            <ThemeProvider initialPreference={theme}>
              <ToastProvider>
                <FeaturesProvider features={features}>
                  <div className="flex min-h-full w-full flex-1 flex-col">
                    {children}
                    <CookieBanner />
                  </div>
                </FeaturesProvider>
              </ToastProvider>
            </ThemeProvider>
          </body>
        </html>
      </TranslationsProvider>
    </UserProvider>
  );
}