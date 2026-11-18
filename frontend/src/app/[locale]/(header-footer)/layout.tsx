import { CurriculumLocationProvider } from "@/components/curriculum/CurriculumLocationContext";
import AppShell from "@/components/layout/AppShell";
import { ShellPanelsProvider } from "@/components/layout/ShellPanels";
import { CURRICULUM, parsePanelCookie, SIDEBAR } from "@/components/layout/shellPanelPrefs";
import { cookies } from "next/headers";
import React from "react";

/**
 * The curriculum location provider sits above the shell, so the sidebar can mark the course you
 * are in and the header can trace the way there without fetching what the page already loaded.
 * The panels provider holds which columns are open and how wide they are, starting from the
 * cookies, so the server already renders them the way the reader left them.
 */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const cookieStore = await cookies();
    const initial = {
        sidebar: parsePanelCookie(SIDEBAR, cookieStore.get(SIDEBAR.cookie)?.value),
        curriculum: parsePanelCookie(CURRICULUM, cookieStore.get(CURRICULUM.cookie)?.value),
    };

    return (
        <CurriculumLocationProvider>
            <ShellPanelsProvider initial={initial}>
                <AppShell>{children}</AppShell>
            </ShellPanelsProvider>
        </CurriculumLocationProvider>
    );
}
