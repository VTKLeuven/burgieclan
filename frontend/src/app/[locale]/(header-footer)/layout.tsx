import { CurriculumLocationProvider } from "@/components/curriculum/CurriculumLocationContext";
import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import Sidebar from "@/components/layout/Sidebar";
import React from "react";

export default function HeaderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        // The page scrolls as one document so the navy header can stay sticky;
        // the sidebar sticks under it rather than owning its own scroll pane.
        // The provider sits above both so the sidebar's folder tree can follow the page
        // below it without re-fetching what that page already loaded.
        <CurriculumLocationProvider>
            <div className="flex min-h-full flex-col bg-vtk-paper">
                {/* Skip to main content link for keyboard users */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-vtk-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-vtk-yellow"
                >
                    Skip to main content
                </a>
                <Header />
                <div className="flex flex-1 items-start">
                    <Sidebar />
                    <main
                        id="main-content"
                        tabIndex={-1}
                        className="min-w-0 flex-1 focus:outline-hidden"
                        style={{
                            '--vtk-loading-min-height': 'calc(100dvh - var(--vtk-header-height))'
                        } as React.CSSProperties}
                    >
                        {children}
                    </main>
                </div>
                <Footer />
            </div>
        </CurriculumLocationProvider>
    );
}
