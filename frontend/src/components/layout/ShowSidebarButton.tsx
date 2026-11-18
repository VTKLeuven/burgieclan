'use client';

import { useSidebarPanel } from '@/components/layout/ShellPanels';
import { cn } from '@/lib/utils';
import { PanelLeftOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Brings the hidden app sidebar back. It always sits at the panel's left edge, where the sidebar
 * returns: in the curriculum column's header when that column is open, in the page header
 * otherwise. Never next to the controls of another column, so the two cannot be confused.
 */
export default function ShowSidebarButton({ className }: { className?: string }) {
    const { t } = useTranslation();
    const sidebar = useSidebarPanel();

    if (sidebar.open) return null;

    return (
        <button
            type="button"
            onClick={() => sidebar.setOpen(true)}
            className={cn('vtk-icon-button', className)}
            aria-label={t('shell.show_sidebar')}
            title={t('shell.show_sidebar')}
        >
            <PanelLeftOpen className="size-[18px]" aria-hidden="true" />
        </button>
    );
}
