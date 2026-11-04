'use client'

import { FileText } from "lucide-react";
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { useTranslation } from "react-i18next";

interface DocumentCategoryProps {
    title: string;
    href: string;
    count?: number;
    apiEndpoints?: string[];
}

export default function DocumentCategory({ title, href, count = 0, apiEndpoints }: DocumentCategoryProps) {
    const { t } = useTranslation();

    const countLabel = count === 0
        ? t('course-page.document-count.zero')
        : count === 1
            ? t('course-page.document-count.one')
            : t('course-page.document-count.other', { count });

    // A category card as on the wireframes' course page: small icon, the name large, the count
    // under it, and the small yellow button at the foot. The whole card is the link.
    return (
        <ApiPrefetchLink href={href} apiEndpoints={apiEndpoints} className="group block rounded-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy focus-visible:ring-offset-2">
            <div className="flex h-full flex-col gap-1 rounded-lg border border-vtk-line bg-vtk-surface p-4 transition-colors duration-150 group-hover:border-vtk-navy">
                <FileText className="h-4 w-4 shrink-0 text-vtk-ink" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="m-0 mt-1 truncate font-display text-xl font-medium tracking-tight text-vtk-ink">{title}</h3>
                <p className="m-0 text-xs text-vtk-muted">{countLabel}</p>
                <span className="vtk-button vtk-button-tag mt-5 self-start">
                    {t('course-page.view-documents')}
                </span>
            </div>
        </ApiPrefetchLink>
    );
}
