import { ComboboxOption } from "@headlessui/react";
import { Course, Document, Module, Program } from "@/types/entities";
import clsx from "clsx";
import { useTranslation } from 'react-i18next';
import { localizedCourseName } from '@/utils/courseName';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import { preloadApi } from '@/hooks/useApi';
import { useRouter } from 'next/navigation';

type SearchResultProps = {
    mainResult: string;
    extraInfo?: string;
    redirect: string;
    apiEndpoint?: string;
};

export default function SearchResult({ mainResult, extraInfo, redirect, apiEndpoint }: SearchResultProps) {
    const router = useRouter();
    const prefetch = () => {
        router.prefetch(redirect);
        if (apiEndpoint) preloadApi(apiEndpoint);
    };

    return <ComboboxOption
        value={{ redirect, apiEndpoint }}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        className="cursor-default select-none px-4 py-2 data-focus:bg-vtk-ink data-focus:text-white"
    >
        {({ focus }) => (<div className="flex justify-between">
            <span className="truncate">{mainResult}</span>
            <span className={clsx('ml-2', focus && 'text-white', !focus && 'text-vtk-muted')}>
                {extraInfo}
            </span>
        </div>
        )}
    </ComboboxOption>
}

export function CourseSearchResult({ course }: { course: Course }) {
    const { t, i18n } = useTranslation();
    return <SearchResult mainResult={localizedCourseName(course, i18n.language) || course.name || course.code || `${t('curriculum-navigator.course', { defaultValue: 'Vak' })} #${course.id}`} extraInfo={course.code}
        redirect={curriculumHref.course(course)} apiEndpoint={`/api/courses/${course.id}`} />
}

export function ModuleSearchResult({ module }: { module: Module }) {
    const { t } = useTranslation();
    return <SearchResult mainResult={module.name || `${t('curriculum-navigator.module', { defaultValue: 'Module' })} #${module.id}`} extraInfo={module.program?.name}
        redirect={curriculumHref.module(module)} apiEndpoint={`/api/modules/${module.id}`} />
}

export function ProgramSearchResult({ program }: { program: Program }) {
    const { t } = useTranslation();
    return <SearchResult mainResult={program.name || `${t('curriculum-navigator.program', { defaultValue: 'Richting' })} #${program.id}`} redirect={curriculumHref.program(program)} apiEndpoint={`/api/programs/${program.id}`} />
}

export function DocumentSearchResult({ document }: { document: Document }) {
    const { i18n } = useTranslation();
    return <SearchResult mainResult={document.name || document.filename || `Document #${document.id}`} extraInfo={localizedCourseName(document.course, i18n.language)}
        redirect={"/document/" + document.id} apiEndpoint={`/api/documents/${document.id}?lang=${i18n.language}`} />
}
