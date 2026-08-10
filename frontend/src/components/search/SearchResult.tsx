import { ComboboxOption } from "@headlessui/react";
import { Course, Document, Module, Program } from "@/types/entities";
import clsx from "clsx";
import { useTranslation } from 'react-i18next';
import { localizedCourseName } from '@/utils/courseName';

type SearchResultProps = {
    mainResult: string;
    extraInfo?: string;
    redirect: string;
};

export default function SearchResult({ mainResult, extraInfo, redirect }: SearchResultProps) {
    return <ComboboxOption
        value={{ redirect }}
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
    const { i18n } = useTranslation();
    return <SearchResult mainResult={localizedCourseName(course, i18n.language)} extraInfo={course.code}
        redirect={"/course/" + course.id} />
}

export function ModuleSearchResult({ module }: { module: Module }) {
    return <SearchResult mainResult={module.name!} extraInfo={module.program!.name}
        redirect={"/module/" + module.id} />
}

export function ProgramSearchResult({ program }: { program: Program }) {
    return <SearchResult mainResult={program.name!} redirect={"/program/" + program.id} />
}

export function DocumentSearchResult({ document }: { document: Document }) {
    const { i18n } = useTranslation();
    return <SearchResult mainResult={document.name!} extraInfo={localizedCourseName(document.course, i18n.language)}
        redirect={"/document/" + document.id} />
}