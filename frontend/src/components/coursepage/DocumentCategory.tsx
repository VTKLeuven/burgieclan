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

    const YellowSectionButton = () => (
        <div className="pt-10 pb-5">
            <span className="bg-wireframe-primary-panache rounded-[5px] p-2 hover:underline">
                {t('course-page.view-documents')}
            </span>
        </div>
    );

    const SectionContent = () => (
        <div className="pl-4 pt-4">
            <div className="flex items-center gap-2">
                <FileText className="w-6 h-6" />
                <h3 className="whitespace-nowrap">{title}</h3>
            </div>
            <YellowSectionButton />
        </div>
    );

    return (
        <Link href={href} className="block">
            <div className="border border-[#E3E3E3] hover:border-wireframe-primary-blue rounded-[14.57px] transform hover:scale-[1.03] transition-transform duration-300 inline-block w-[107%]">
                <SectionContent />
            </div>
        </Link>
    );
}