'use client';

import AthensReviewDialog from '@/components/exchange/AthensReviewDialog';
import ExchangeInfo from '@/components/exchange/ExchangeInfo';
import ShareReportDialog from '@/components/exchange/ShareReportDialog';
import PageHeader, { Breadcrumbs, type Crumb } from '@/components/layout/PageHeader';
import Link from '@/components/ui/Link';
import { cn } from '@/lib/utils';
import { Earth, Plus } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type ShareContextValue = (destinationId?: number) => void;
const ShareContext = createContext<ShareContextValue>(() => {});

/**
 * Opens "Deel je ervaring" from anywhere on an exchange page, optionally for one destination; on
 * the ATHENS pages, the review form, optionally for one course.
 */
export const useShareExperience = () => useContext(ShareContext);

/**
 * The frame of every exchange page: the header with the trail, the ⓘ and "Deel je ervaring",
 * the Erasmus / ATHENS / shorter tabs where they apply, and the share dialog: an exchange report,
 * or on the ATHENS pages a course review.
 */
export default function ExchangeShell({
    crumbs = [],
    tab,
    destinationId,
    courseId,
    children,
}: {
    /** Levels after "Uitwisselingen". */
    crumbs?: Crumb[];
    tab?: 'erasmus' | 'athens' | 'short';
    /** The destination the page is about, chosen beforehand when sharing from its header. */
    destinationId?: number;
    /** On an ATHENS page: the header's button writes a review, of this course if given. */
    courseId?: number;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    const athens = tab === 'athens' || courseId !== undefined;
    const [sharing, setSharing] = useState<{ id?: number } | null>(null);
    const share = useCallback<ShareContextValue>((id) => setSharing({ id }), []);

    const trail = useMemo<Crumb[]>(
        () => [{ label: t('exchange.title'), href: crumbs.length > 0 ? '/exchange' : undefined, icon: <Earth /> }, ...crumbs],
        [crumbs, t],
    );

    return (
        <ShareContext.Provider value={share}>
            <PageHeader
                breadcrumb={
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                        <Breadcrumbs crumbs={trail} className={trail.length === 1 ? 'flex-none' : undefined} />
                        {trail.length === 1 && <ExchangeInfo />}
                    </div>
                }
                actions={
                    <button type="button" onClick={() => share(athens ? courseId : destinationId)} className="vtk-button vtk-button-primary vtk-button-sm">
                        <Plus className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">{t(athens ? 'exchange.athens.share' : 'exchange.share')}</span>
                    </button>
                }
            />

            <div className="vtk-shell">
                {tab && (
                    <nav aria-label={t('exchange.title')} className="mb-6 flex items-center gap-5 border-b border-border">
                        {(['erasmus', 'athens', 'short'] as const).map((key) => (
                            <Link
                                key={key}
                                href={key === 'erasmus' ? '/exchange' : `/exchange/${key}`}
                                aria-current={tab === key ? 'page' : undefined}
                                className={cn(
                                    'relative -mb-px inline-flex h-10 items-center border-b-2 text-body font-medium whitespace-nowrap transition-colors',
                                    tab === key ? 'border-primary text-primary-text' : 'border-transparent text-fg-muted hover:text-fg',
                                )}
                            >
                                {t(`exchange.tabs.${key}`)}
                            </Link>
                        ))}
                    </nav>
                )}
                {children}
            </div>

            {athens ? (
                <AthensReviewDialog open={sharing !== null} initialCourseId={sharing?.id} onClose={() => setSharing(null)} />
            ) : (
                <ShareReportDialog open={sharing !== null} initialDestinationId={sharing?.id} onClose={() => setSharing(null)} />
            )}
        </ShareContext.Provider>
    );
}
