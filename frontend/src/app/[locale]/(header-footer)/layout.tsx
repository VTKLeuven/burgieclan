import "@/app/globals.css";
import React from "react";
import Footer from "@/components/footer/Footer";
import HeaderWrapper from "@/components/header/HeaderWrapper";
import { ToastProvider } from "@/components/ui/Toast";

export default function HeaderLayout({
                                         children
                                     }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        // The root layout.tsx (the one in [locale]) is a Server Component by default in Next.js, as indicated by the
        // async function. However, ToastProvider is explicitly marked with 'use client'
        // and uses React hooks (useState, useContext) which can only run on the client side.
        <ToastProvider>
            <div className="flex h-full flex-col min-h-full">
                <HeaderWrapper />
                <div className="grow">
                    {children}
                </div>
                <Footer />
            </div>
        </ToastProvider>
    );
}