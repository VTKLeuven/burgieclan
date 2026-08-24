'use client'

import { FileText } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface DocumentCategoryProps {
    title: string;
    href: string;
    count?: number;
}

export default function DocumentCategory({ title, href, count = 0 }: DocumentCategoryProps) {
    const { t } = useTranslation();

    const countLabel = count === 0
        ? t('course-page.document-count.zero')
        : count === 1
            ? t('course-page.document-count.one')
            : t('course-page.document-count.other', { count });

    return (
        <Link href={href} className="group block">
            <div className="flex h-full flex-col justify-between gap-6 rounded-[18px] border border-vtk-line bg-vtk-surface p-5 transition-[transform,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-vtk-line-2">
                <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4.5 w-4.5 shrink-0 text-vtk-muted" />
                        <h3 className="m-0 text-[15px] font-semibold tracking-tight text-vtk-ink truncate">{title}</h3>
                    </div>
                    <span
                        className="vtk-badge vtk-badge-muted shrink-0 text-xs"
                        title={countLabel}
                        aria-label={countLabel}
                    >
                        {count}
                    </span>
                </div>
                <span className="vtk-button vtk-button-sm vtk-button-subtle self-start">
                    {t('course-page.view-documents')}
                </span>
            </div>
        </Link>
    );
}