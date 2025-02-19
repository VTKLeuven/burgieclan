import "@/app/globals.css";
import React from "react";
import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import Sidebar from "@/components/sidebar/Sidebar";

export default function HeaderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <>
            <div className="flex flex-col">
                <Header />
                <div className="flex flex-auto">
                    <Sidebar />
                    <main className="flex flex-auto">
                        {children}
                    </main>
                </div>
                <Footer/>
            </div>
        </>
    );
}