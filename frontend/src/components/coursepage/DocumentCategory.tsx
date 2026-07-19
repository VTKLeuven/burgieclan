'use client'

import { FileText } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface DocumentCategoryProps {
    title: string;
    href: string;
}

export default function DocumentCategory({ title, href }: DocumentCategoryProps) {
    const { t } = useTranslation();

    return (
        <Link href={href} className="group block">
            <div className="flex h-full flex-col justify-between gap-6 rounded-[18px] border border-vtk-line bg-vtk-surface p-5 transition-[transform,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-vtk-line-2">
                <div className="flex items-center gap-2.5">
                    <FileText className="h-4.5 w-4.5 shrink-0 text-vtk-muted" />
                    <h3 className="m-0 text-[15px] font-semibold tracking-tight text-vtk-ink">{title}</h3>
                </div>
                <span className="vtk-button vtk-button-sm vtk-button-subtle self-start">
                    {t('course-page.view-documents')}
                </span>
            </div>
        </Link>
    );
}