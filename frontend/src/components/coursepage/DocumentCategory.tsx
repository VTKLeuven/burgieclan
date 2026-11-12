'use client'

import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { ChevronRight, Folder } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DocumentCategoryProps {
    title: string;
    href: string;
    count?: number;
    apiEndpoints?: string[];
}

/** One folder of a course as a list row: icon, name, how many documents, and a chevron. */
export default function DocumentCategory({ title, href, count = 0, apiEndpoints }: DocumentCategoryProps) {
    const { t } = useTranslation();

    const countLabel = count === 0
        ? t('course-page.document-count.zero')
        : count === 1
            ? t('course-page.document-count.one')
            : t('course-page.document-count.other', { count });

    return (
        <ApiPrefetchLink href={href} apiEndpoints={apiEndpoints} className="vtk-list-row group">
            <Folder className="size-4 shrink-0 text-icon" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{title}</span>
            <span className={`shrink-0 text-small tabular ${count === 0 ? 'text-fg-placeholder' : 'text-fg-muted'}`}>
                {countLabel}
            </span>
            <ChevronRight className="size-4 shrink-0 text-fg-placeholder transition-colors group-hover:text-icon" aria-hidden="true" />
        </ApiPrefetchLink>
    );
}
