'use client';

import { useSiblingDocuments } from '@/hooks/useSiblingDocuments';
import type { Document } from '@/types/entities';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Step to the previous or next document in the same folder.
 *
 * Reading exercise session 1 of 6 used to mean going back to the category page for every next
 * file. The order is the category page's own - newest academic year first, name as the
 * tiebreaker - so "next" means what the list said it would.
 */
export default function DocumentSiblingNav({ document }: { document: Document }) {
    const { t, i18n } = useTranslation();
    const { documents } = useSiblingDocuments(document.course?.id, document.category?.id);

    const index = documents.findIndex((sibling) => sibling.id === document.id);

    // Nothing to step through, or the document fell outside the window the hook fetches.
    if (index === -1 || documents.length < 2) {
        return null;
    }

    const previous = documents[index - 1];
    const next = documents[index + 1];

    const arrow = 'vtk-icon-button h-8 w-8';
    const disabled = 'pointer-events-none opacity-40';

    return (
        <div className="flex items-center gap-1.5">
            {previous ? (
                <ApiPrefetchLink
                    href={`/document/${previous.id}`}
                    apiEndpoints={`/api/documents/${previous.id}?lang=${i18n.language}`}
                    className={arrow}
                    title={previous.name ?? t('document.siblings.previous')}
                    aria-label={t('document.siblings.previous')}
                >
                    <ChevronLeft size={16} />
                </ApiPrefetchLink>
            ) : (
                <span className={`${arrow} ${disabled}`} aria-hidden="true">
                    <ChevronLeft size={16} />
                </span>
            )}

            <span className="whitespace-nowrap text-xs tabular-nums text-vtk-muted">
                {t('document.siblings.position', { index: index + 1, total: documents.length })}
            </span>

            {next ? (
                <ApiPrefetchLink
                    href={`/document/${next.id}`}
                    apiEndpoints={`/api/documents/${next.id}?lang=${i18n.language}`}
                    className={arrow}
                    title={next.name ?? t('document.siblings.next')}
                    aria-label={t('document.siblings.next')}
                >
                    <ChevronRight size={16} />
                </ApiPrefetchLink>
            ) : (
                <span className={`${arrow} ${disabled}`} aria-hidden="true">
                    <ChevronRight size={16} />
                </span>
            )}
        </div>
    );
}
