import "./globals.css";
import React from "react";
import { Inter } from 'next/font/google'
import CookieBanner from "@/components/cookie-banner/CookieBanner";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`}>
      <body className="h-full">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}