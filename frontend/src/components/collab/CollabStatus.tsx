'use client'

import type { ConnectionStatus } from '@/components/collab/useCollabSession';
import { useTranslation } from 'react-i18next';

const STATUS_DOT: Record<ConnectionStatus, string> = {
    connecting: 'bg-vtk-yellow',
    connected: 'bg-emerald-500',
    disconnected: 'bg-vtk-muted',
    denied: 'bg-red-600',
    unavailable: 'bg-red-600',
};

interface CollabStatusProps {
    status: ConnectionStatus;
    readOnly: boolean;
    /** Names of everyone who has the document open, yourself included. */
    people: string[];
}

/**
 * One line saying whether the live connection is up, who else is here, and whether you can edit.
 */
export default function CollabStatus({ status, readOnly, people }: CollabStatusProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-vtk-muted" aria-live="polite">
            <span className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
                {t(`collab.status.${status}`)}
            </span>
            {status === 'connected' && (
                <span title={people.join(', ')}>{t('collab.people_here', { count: people.length })}</span>
            )}
            {readOnly && status === 'connected' && (
                <span className="rounded-sm bg-vtk-paper-2 px-2 py-0.5 text-xs font-semibold text-vtk-body">
                    {t('collab.read_only')}
                </span>
            )}
        </div>
    );
}
