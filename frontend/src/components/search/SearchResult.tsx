import { ComboboxOption } from "@headlessui/react";
import { Course, Document, ExamQuestionSearchHit, Module, Program } from "@/types/entities";
import clsx from "clsx";
import { useTranslation } from 'react-i18next';
import { courseTitle, matchedAlternateTitle } from '@/utils/courseName';
import { examCalendarYear } from '@/utils/examPeriods';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import { preloadApi } from '@/hooks/useApi';
import { useRouter } from 'next/navigation';

type SearchResultProps = {
    mainResult: string;
    subtitle?: string;
    extraInfo?: string;
    redirect: string;
    apiEndpoint?: string;
};

export default function SearchResult({ mainResult, subtitle, extraInfo, redirect, apiEndpoint }: SearchResultProps) {
    const router = useRouter();
    const prefetch = () => {
        router.prefetch(redirect);
        if (apiEndpoint) preloadApi(apiEndpoint);
    };

    return <ComboboxOption
        value={{ redirect, apiEndpoint }}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        className="cursor-default select-none rounded-[8px] px-2 py-2 data-focus:bg-neutral-150"
    >
        {({ focus }) => (<div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate">
                {mainResult}
                {subtitle && (
                    <span className={clsx('ml-1.5 text-small', focus ? 'text-fg-secondary' : 'text-fg-muted')}>
                        · {subtitle}
                    </span>
                )}
            </span>
            <span className={clsx('shrink-0 text-small tabular', focus ? 'text-fg-secondary' : 'text-fg-muted')}>
                {extraInfo}
            </span>
        </div>
        )}
    </ComboboxOption>
}

export function CourseSearchResult({ course, query }: { course: Course; query?: string }) {
    const { t } = useTranslation();
    const alt = matchedAlternateTitle(course, query);
    return <SearchResult
        mainResult={courseTitle(course) || course.name || course.code || `${t('curriculum-navigator.course', { defaultValue: 'Vak' })} #${course.id}`}
        subtitle={alt ? t('search.also_known_as', { title: alt }) : undefined}
        extraInfo={course.code}
        redirect={curriculumHref.course(course)}
        apiEndpoint={`/api/courses/${course.id}`}
    />
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
    return <SearchResult mainResult={document.name || document.filename || `Document #${document.id}`} extraInfo={courseTitle(document.course)}
        redirect={"/document/" + document.id} apiEndpoint={`/api/documents/${document.id}?lang=${i18n.language}`} />
}

/**
 * A question of an exam reconstruction: what matched, and below it the course and the exam. Opens
 * the exam at the question (#q-{uid}), which the exam page scrolls to and highlights.
 */
export function ExamQuestionSearchResult({ hit, query }: { hit: ExamQuestionSearchHit; query?: string }) {
    const { t } = useTranslation();
    const router = useRouter();
    const page = `/course/${hit.course.id}/exams/${hit.examId}`;
    const course = courseTitle(hit.course) || hit.course.code;
    const alt = matchedAlternateTitle(hit.course, query);
    const exam = t(`exam.name.${hit.period}`, { year: examCalendarYear(hit.academicYear) });

    return <ComboboxOption
        value={{ redirect: `${page}#q-${encodeURIComponent(hit.uid)}` }}
        onMouseEnter={() => router.prefetch(page)}
        onFocus={() => router.prefetch(page)}
        className="cursor-default select-none rounded-[8px] px-2 py-2 data-focus:bg-neutral-150"
    >
        {({ focus }) => (<div className="grid gap-0.5">
            <span className="line-clamp-2">{hit.snippet}</span>
            <span className={clsx('truncate text-caption', focus ? 'text-fg-secondary' : 'text-fg-muted')}>
                {course}{alt ? ` · ${t('search.also_known_as', { title: alt })}` : ''} · {exam}
            </span>
        </div>
        )}
    </ComboboxOption>
}
