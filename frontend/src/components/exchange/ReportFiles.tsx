'use client';

import { useToast } from '@/components/ui/Toast';
import { useExchangeActions } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import type { ExchangeReport, ExchangeReportFile } from '@/types/entities';
import { formatFileSize } from '@/utils/fileSize';
import { FileImage, FileSpreadsheet, FileText, Presentation, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Shown in a new tab (the backend serves them inline); everything else is downloaded. */
const OPENS_IN_TAB = ['pdf', 'png', 'jpg', 'jpeg'];

export function fileIcon(extension: string): LucideIcon {
    if (['xlsx', 'xls', 'ods', 'csv'].includes(extension)) return FileSpreadsheet;
    if (['png', 'jpg', 'jpeg'].includes(extension)) return FileImage;
    if (extension === 'pptx') return Presentation;
    return FileText;
}

/** "PDF · 1.2 MB" */
export function fileMeta(extension: string, size: number): string {
    return [extension.toUpperCase(), formatFileSize(size)].filter(Boolean).join(' · ');
}

/**
 * The files attached to a report, each a button that asks for a fresh link and opens it. A PDF or
 * image opens in a new tab; the tab is opened right away, while the click still counts as one, and
 * pointed at the file once the link is there, since a browser blocks tabs opened after a wait.
 */
export default function ReportFiles({ report, className }: { report: ExchangeReport; className?: string }) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { fileUrl } = useExchangeActions();
    const [opening, setOpening] = useState<number | null>(null);

    if (report.files.length === 0) return null;

    const open = async (file: ExchangeReportFile) => {
        const inTab = OPENS_IN_TAB.includes(file.extension);
        const tab = inTab ? window.open('', '_blank') : null;
        setOpening(file.id);
        try {
            const url = await fileUrl(report.id, file.id);
            if (tab) {
                tab.opener = null;
                tab.location.href = url;
            } else {
                // Served as an attachment: following it saves the file and leaves this page alone.
                const link = document.createElement('a');
                link.href = url;
                link.rel = 'noopener';
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
        } catch {
            tab?.close();
            showToast(t('exchange.destination.file_failed'), 'error');
        } finally {
            setOpening(null);
        }
    };

    return (
        <ul className={cn('m-0 flex list-none flex-col gap-1.5 p-0', className)}>
            {report.files.map((file) => {
                const Icon = fileIcon(file.extension);
                return (
                    <li key={file.id}>
                        <button
                            type="button"
                            onClick={() => open(file)}
                            disabled={opening === file.id}
                            aria-label={t('exchange.destination.file_open', { name: file.name })}
                            className="group flex w-full max-w-md items-center gap-3 rounded-control border border-border px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-hover disabled:opacity-60"
                        >
                            <span className="grid size-8 shrink-0 place-items-center rounded-chip bg-surface-muted text-icon">
                                <Icon className="size-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-body font-medium text-fg group-hover:text-link">{file.name}</span>
                                <span className="block text-caption text-fg-muted tabular">{fileMeta(file.extension, file.size)}</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
