import "@/app/globals.css";
import React from "react";
import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function HeaderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="flex h-full flex-col min-h-full">
            <Header />
            <div className="grow flex flex-1">
                <Sidebar />
                {children}
            </div>
            <Footer />
        </div>
    );
}