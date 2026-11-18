import { CurriculumLocationProvider } from "@/components/curriculum/CurriculumLocationContext";
import CurriculumPanel from "@/components/curriculum/CurriculumPanel";
import { CurriculumPanelProvider } from "@/components/curriculum/CurriculumPanelContext";
import GlobalSearch from "@/components/layout/GlobalSearch";
import MobileNav from "@/components/layout/MobileNav";
import Sidebar from "@/components/layout/Sidebar";
import React from "react";

/**
 * The app shell, in Dopl's layout: the sidebar sits on the grey canvas, every page lives in one
 * white panel inset from the window edge, and only that panel scrolls. Each page draws its own
 * PageHeader (breadcrumb and actions) as the panel's sticky top bar.
 *
 * The curriculum location provider sits above both, so the sidebar can mark the course you are
 * in and the header can trace the way there without fetching what the page already loaded.
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <CurriculumLocationProvider>
            <CurriculumPanelProvider>
                <div className="flex h-dvh bg-canvas">
                    <a
                        href="#main-content"
                        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-body focus:font-medium focus:text-on-primary"
                    >
                        Skip to main content
                    </a>
                    <aside className="hidden w-[var(--sidebar-width)] shrink-0 md:block">
                        <Sidebar />
                    </aside>
                    {/* The white panel. On curriculum pages it opens with the folder tree in a column of
                        its own; only the page beside it is the scroll root. */}
                    <div className="relative flex min-w-0 flex-1 overflow-hidden bg-surface md:my-[var(--panel-inset)] md:mr-[var(--panel-inset)] md:rounded-panel md:border md:border-border">
                        <CurriculumPanel />
                        <main
                            id="main-content"
                            tabIndex={-1}
                            data-scroll-root
                            className="relative flex min-w-0 flex-1 flex-col overflow-y-auto focus:outline-hidden"
                        >
                            {children}
                        </main>
                    </div>
                    <MobileNav />
                    <GlobalSearch />
                </div>
            </CurriculumPanelProvider>
        </CurriculumLocationProvider>
    );
}
