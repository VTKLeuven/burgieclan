import "@/app/globals.css";
import React from "react";
import Footer from "@/components/footer/Footer";
import HeaderWrapper from "@/components/header/HeaderWrapper";
import initTranslations from "@/app/i18n";
import TranslationsProvider from "@/components/TranslationProvider";

export default async function HeaderLayout({ children, params: { locale } }: Readonly<{ children: React.ReactNode, params: { locale: string } }>) {
    const { t, resources } = await initTranslations(locale);

    return (
        <TranslationsProvider
            locale={locale}
            resources={resources}>
            <div className="flex h-full flex-col min-h-full">
                <HeaderWrapper />
                <div className="grow">
                    {children}
                </div>
                <Footer />
            </div>
        </TranslationsProvider>
    );
}