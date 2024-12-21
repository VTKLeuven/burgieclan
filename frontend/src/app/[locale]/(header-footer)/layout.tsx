import "@/app/globals.css";
import React from "react";
import Footer from "@/components/footer/Footer";
import HeaderWrapper from "@/components/header/HeaderWrapper";

export default async function HeaderLayout({ children, params: { locale } }: Readonly<{ children: React.ReactNode, params: { locale: string } }>) {
    return (
        <div className="flex h-full flex-col min-h-full">
            <HeaderWrapper />
            <div className="grow">
                {children}
            </div>
            <Footer />
        </div>
    );
}