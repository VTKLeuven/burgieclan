import { Combobox, ComboboxInput, ComboboxOptions, Dialog, DialogBackdrop, DialogPanel, } from '@headlessui/react'
import { Frown, Globe, Search as SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react'
import FoldableSection from "@/components/common/FoldableSection";
import type { Course, Document, Module, Program } from '@/types/entities';
import {
    CourseSearchResult,
    DocumentSearchResult,
    ModuleSearchResult,
    ProgramSearchResult
} from "@/components/search/SearchResult";
import { objectToCourse, objectToDocument, objectToModule, objectToProgram } from '@/utils/objectToTypeConvertor';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/hooks/useApi';

type SearchPopupProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

type SearchResults = {
    courses: Course[];
    modules: Module[];
    programs: Program[];
    documents: Document[];
};

export default function SearchPopup({ open, setOpen }: SearchPopupProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [items, setItems] = useState<SearchResults>({ courses: [], modules: [], programs: [], documents: [] });
    const { error, loading, isRedirecting, request } = useApi();
    const { t } = useTranslation();

    /**
     * Remove all fields starting with '@' from the object
     * @param obj - The object to clean
     * @returns The cleaned object
     */
    function convertToObjects(obj: Record<string, any[]>): SearchResults {
        const items: SearchResults = { courses: [], modules: [], programs: [], documents: [] };
        obj['courses']?.forEach((course) => {
            items.courses.push(objectToCourse(course));
        });
        obj['modules']?.forEach((module) => {
            items.modules.push(objectToModule(module));
        });
        obj['programs']?.forEach((program) => {
            items.programs.push(objectToProgram(program));
        });
        obj['documents']?.forEach((document) => {
            items.documents.push(objectToDocument(document));
        });
        return items;
    }

    // Setup debouncing for query
    useEffect(() => {
        // Wait 300ms after typing stops before executing search
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        // Clean up timeout if query changes before timer completes
        return () => clearTimeout(timer);
    }, [query]);

    // Fetch data when debounced query changes
    useEffect(() => {
        const fetchData = async () => {
            if (debouncedQuery.length <= 2) {
                setItems({ courses: [], modules: [], programs: [], documents: [] });
                return;
            }

            const result = await request('GET', `/api/search?searchText=${debouncedQuery}`);
            if (result) {
                setItems(convertToObjects(result));
            }
        };

        fetchData();
    }, [debouncedQuery, request]);

    return (
        <Dialog
            transition
            className="relative z-10"
            open={open}
            onClose={() => {
                setOpen(false);
                setQuery('');
            }}
        >
            <DialogBackdrop
                transition
                className="fixed inset-0 backdrop-blur-sm bg-gray-500 bg-opacity-25 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
            />

            <div className="fixed inset-0 z-10 w-screen rounded-md overflow-y-auto p-4 sm:p-6 md:p-20">
                <DialogPanel
                    transition
                    className="mx-auto max-w-xl transform overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
                >
                    <Combobox
                        onChange={(param: { redirect: Location | (string & Location) } | null) => {
                            if (param?.redirect) {
                                window.location = param.redirect;
                            }
                        }}
                    >
                        <div>
                            <div className="relative">
                                <SearchIcon
                                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                                <ComboboxInput
                                    autoFocus
                                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                                    placeholder={t('search.placeholder')}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onBlur={() => setQuery('')}
                                />
                            </div>

                            {loading && (
                                <div className="flex justify-center py-12">
                                    <svg className="animate-spin h-8 w-8 text-gray-900" xmlns="http://www.w3.org/2000/svg"
                                        fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                </div>
                            )}

                            {/* Show redirecting state */}
                            {isRedirecting && (
                                <div className="border-t border-gray-100 px-6 py-14 text-center text-sm sm:px-14">
                                    <svg className="mx-auto animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg"
                                        fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    <p className="mt-4 font-semibold text-gray-900">{t('redirecting')}</p>
                                    <p className="mt-2 text-gray-500">{t('session_expired')}</p>
                                </div>
                            )}

                            {error && !isRedirecting && (
                                <div className="border-t border-gray-100 px-6 py-14 text-center text-sm sm:px-14">
                                    <Frown className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true" />
                                    <p className="mt-4 font-semibold text-gray-900">{t('unexpected')}</p>
                                    <p className="mt-2 text-gray-500">{error.message}</p>
                                </div>
                            )}

                            {!error && !isRedirecting && query.length <= 2 && (
                                <div className="border-t border-gray-100 px-6 py-14 text-center text-sm sm:px-14">
                                    <Globe className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true" />
                                    <p className="mt-4 font-semibold text-gray-900">{t('search.info')}</p>
                                    <p className="mt-2 text-gray-500">{t('search.info_sub')}</p>
                                </div>
                            )}

                            {!error && !isRedirecting && query.length > 2 && Object.values(items).some(value => Array.isArray(value) && value.length > 0) && (
                                <div>
                                    <ComboboxOptions
                                        static
                                        as="ul"
                                        className="max-h-[calc(100vh-15rem)] scroll-pb-2 scroll-pt-11 space-y-2 overflow-y-auto pb-2 pl-0"
                                    >
                                        {items.courses.length > 0 &&
                                            <FoldableSection key={'courses'} title={t('courses')} defaultOpen={true}>
                                                <li className="list-none">
                                                    <ul
                                                        className="mt-2 text-sm text-gray-800 pl-0"
                                                    >
                                                        {items.courses.map((course) => (
                                                            <CourseSearchResult key={course.id} course={course} />
                                                        ))}
                                                    </ul>
                                                </li>
                                            </FoldableSection>
                                        }
                                        {items.modules.length > 0 &&
                                            <FoldableSection key={'modules'} title={t('modules')} defaultOpen={true}>
                                                <li className="list-none">
                                                    <ul
                                                        className="mt-2 text-sm text-gray-800 pl-0"
                                                    >
                                                        {items.modules.map((module) => (
                                                            <ModuleSearchResult key={module.id} module={module} />
                                                        ))}
                                                    </ul>
                                                </li>
                                            </FoldableSection>
                                        }
                                        {items.programs.length > 0 &&
                                            <FoldableSection key={'programs'} title={t('programs')} defaultOpen={true}>
                                                <li className="list-none">
                                                    <ul
                                                        className="mt-2 text-sm text-gray-800 pl-0"
                                                    >
                                                        {items.programs.map((program) => (
                                                            <ProgramSearchResult key={program.id} program={program} />
                                                        ))}
                                                    </ul>
                                                </li>
                                            </FoldableSection>
                                        }
                                        {items.documents.length > 0 &&
                                            <FoldableSection key={'documents'} title={t('documents')} defaultOpen={true}>
                                                <li className="list-none">
                                                    <ul
                                                        className="mt-2 text-sm text-gray-800 pl-0"
                                                    >
                                                        {items.documents.map((document) => (
                                                            <DocumentSearchResult key={document.id} document={document} />
                                                        ))}
                                                    </ul>
                                                </li>
                                            </FoldableSection>
                                        }
                                    </ComboboxOptions>
                                </div>
                            )}

                            {!error && !loading && !isRedirecting && query.length > 2 && Object.values(items).every(value => Array.isArray(value) && value.length === 0) && (
                                <div className="border-t border-gray-100 px-6 py-14 text-center text-sm sm:px-14">
                                    <Frown className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true" />
                                    <p className="mt-4 font-semibold text-gray-900">{t('search.no_results')}</p>
                                    <p className="mt-2 text-gray-500">{t('search.no_results_sub')}</p>
                                </div>
                            )}
                        </div>
                    </Combobox>
                </DialogPanel>
            </div>
        </Dialog>
    )
}
