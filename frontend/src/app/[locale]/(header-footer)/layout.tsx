import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import Sidebar from "@/components/layout/Sidebar";
import React from "react";

export default function HeaderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        // The page scrolls as one document so the navy header can stay sticky;
        // the sidebar sticks under it rather than owning its own scroll pane.
        <div className="flex min-h-full flex-col bg-vtk-paper">
            <Header />
            <div className="flex flex-1 items-start">
                <Sidebar />
                <main className="min-w-0 flex-1">
                    {children}
                </main>
            </div>
            <Footer />
        </div>
    );
}
