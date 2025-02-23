import { ComboboxOption } from "@headlessui/react";
import { Course, Document, Module, Program } from "@/types/entities";
import clsx from "clsx";

type SearchResultProps = {
    mainResult: string;
    extraInfo?: string;
    value: string;
};

export default function SearchResult({ mainResult, extraInfo, value }: SearchResultProps) {
    return <ComboboxOption
        value={{ value }}
        className="cursor-default select-none px-4 py-2 data-[focus]:bg-amber-600 data-[focus]:text-white"
    >
        {({ focus }) => (<div className="flex justify-between">
            <span className="truncate">{mainResult}</span>
            <span className={clsx('ml-2', focus && 'text-white', !focus && 'text-gray-500')}>
                {extraInfo}
            </span>
        </div>
        )}
    </ComboboxOption>
}

export function CourseSearchResult({ course }: { course: Course }) {
    return <SearchResult mainResult={course.name!} extraInfo={course.code}
        value={"/course/" + course.id} />
}

export function ModuleSearchResult({ module }: { module: Module }) {
    return <SearchResult mainResult={module.name!} extraInfo={module.program!.name}
        value={"/module/" + module.id} />
}

export function ProgramSearchResult({ program }: { program: Program }) {
    return <SearchResult mainResult={program.name!} value={"/program/" + program.id} />
}

export function DocumentSearchResult({ document }: { document: Document }) {
    return <SearchResult mainResult={document.name!} extraInfo={document.course!.name}
        value={"/document/" + document.id} />
}