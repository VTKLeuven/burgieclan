import { ComboboxOption } from "@headlessui/react";
import { Course, Document, ExamQuestionSearchHit, Module, Program } from "@/types/entities";
import clsx from "clsx";
import { useTranslation } from 'react-i18next';
import { localizedCourseName } from '@/utils/courseName';
import { examCalendarYear } from '@/utils/examPeriods';
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

/**
 * A question of an exam reconstruction: what matched, and below it the course and the exam. Opens
 * the exam at the question (#q-{uid}), which the exam page scrolls to and highlights.
 */
export function ExamQuestionSearchResult({ hit }: { hit: ExamQuestionSearchHit }) {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const page = `/course/${hit.course.id}/exams/${hit.examId}`;
    const course = localizedCourseName(hit.course, i18n.language) || hit.course.code;
    const exam = t(`exam.name.${hit.period}`, { year: examCalendarYear(hit.academicYear) });

    return <ComboboxOption
        value={{ redirect: `${page}#q-${encodeURIComponent(hit.uid)}` }}
        onMouseEnter={() => router.prefetch(page)}
        onFocus={() => router.prefetch(page)}
        className="cursor-default select-none px-4 py-2 data-focus:bg-vtk-ink data-focus:text-white"
    >
        {({ focus }) => (<div className="grid gap-0.5">
            <span className="line-clamp-2">{hit.snippet}</span>
            <span className={clsx('truncate text-xs', focus ? 'text-white' : 'text-vtk-muted')}>
                {course} · {exam}
            </span>
        </div>
        )}
    </ComboboxOption>
}
