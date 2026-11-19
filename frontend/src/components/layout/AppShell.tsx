'use client';

import CurriculumPanel from '@/components/curriculum/CurriculumPanel';
import GlobalSearch from '@/components/layout/GlobalSearch';
import MobileNav from '@/components/layout/MobileNav';
import ResizeHandle from '@/components/layout/ResizeHandle';
import { useSidebarPanel } from '@/components/layout/ShellPanels';
import Sidebar from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The app shell, in Dopl's layout: the sidebar sits on the navy ground, every page lives in one
 * white panel inset from the window edge, and only that panel scrolls. Each page draws its own
 * PageHeader (breadcrumb and actions) as the panel's sticky top bar.
 *
 * From md the sidebar can be hidden and dragged wider or narrower; with it hidden the panel is
 * inset on all sides and the page header offers to bring it back.
 */
export default function AppShell({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const sidebar = useSidebarPanel();
    const sidebarRef = useRef<HTMLElement>(null);

    return (
        <div className="flex h-dvh bg-sidebar">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-body focus:font-medium focus:text-on-primary"
            >
                Skip to main content
            </a>
            {sidebar.open && (
                <aside ref={sidebarRef} style={{ width: sidebar.width }} className="relative hidden shrink-0 md:block">
                    <Sidebar onCollapse={() => sidebar.setOpen(false)} />
                    <ResizeHandle panel={sidebar} targetRef={sidebarRef} label={t('shell.resize_sidebar')} />
                </aside>
            )}
            {/* The white panel. On curriculum pages it opens with the folder tree in a column of
                its own; only the page beside it is the scroll root. */}
            <div
                className={cn(
                    'relative flex min-w-0 flex-1 overflow-hidden bg-surface md:my-[var(--panel-inset)] md:mr-[var(--panel-inset)] md:rounded-panel md:border md:border-border',
                    !sidebar.open && 'md:ml-[var(--panel-inset)]',
                )}
            >
                <CurriculumPanel />
                <main
                    id="main-content"
                    tabIndex={-1}
                    data-scroll-root
                    // Never sideways: anything wider than the panel scrolls within itself (tables,
                    // the PDF viewer) rather than dragging the whole page along.
                    className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto focus:outline-hidden"
                >
                    {children}
                </main>
            </div>
            <MobileNav />
            <GlobalSearch />
        </div>
    );
}
