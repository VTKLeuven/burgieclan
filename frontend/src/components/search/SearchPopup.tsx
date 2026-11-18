import FoldableSection from "@/components/common/FoldableSection";
import {
    CourseSearchResult,
    DocumentSearchResult,
    ExamQuestionSearchResult,
    ModuleSearchResult,
    ProgramSearchResult
} from "@/components/search/SearchResult";
import { useApi } from '@/hooks/useApi';
import type { Course, Document, ExamQuestionSearchHit, Module, Program } from '@/types/entities';
import {
    convertToCourse,
    convertToDocument,
    convertToExamQuestionSearchHit,
    convertToModule,
    convertToProgram,
} from '@/utils/convertToEntity';
import { Combobox, ComboboxInput, ComboboxOptions, Dialog, DialogBackdrop, DialogPanel, } from '@headlessui/react';
import { Frown, Globe, Search as SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { i18nConfig } from '../../../i18nConfig';

type SearchPopupProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

type SearchResults = {
    courses: Course[];
    modules: Module[];
    programs: Program[];
    documents: Document[];
    examQuestions: ExamQuestionSearchHit[];
};

const NO_RESULTS: SearchResults = { courses: [], modules: [], programs: [], documents: [], examQuestions: [] };

type SearchApiResponse = Partial<Record<keyof SearchResults, unknown[]>>;

const LOCALE_PREFIX = new RegExp(`^/(?:${i18nConfig.locales.join('|')})(?=/|$)`);

/**
 * Whether a result only moves within the page you are on, like a question of the exam you have
 * open. Results link without a locale; the address bar may have one (`/en/...`).
 */
function isOnThisPage(redirect: string): boolean {
    const target = new URL(redirect, window.location.href);
    const current = window.location.pathname.replace(LOCALE_PREFIX, '') || '/';
    return target.hash !== '' && target.pathname === current;
}

export default function SearchPopup({ open, setOpen }: SearchPopupProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [items, setItems] = useState<SearchResults>(NO_RESULTS);
    const { error, loading, isRedirecting, request } = useApi<SearchApiResponse | null>();
    const { t } = useTranslation();
    const router = useRouter();

    function convertToObjects(obj: SearchApiResponse): SearchResults {
        const items: SearchResults = { courses: [], modules: [], programs: [], documents: [], examQuestions: [] };
        obj['courses']?.forEach((course) => {
            items.courses.push(convertToCourse(course));
        });
        obj['modules']?.forEach((module) => {
            items.modules.push(convertToModule(module));
        });
        obj['programs']?.forEach((program) => {
            items.programs.push(convertToProgram(program));
        });
        obj['documents']?.forEach((document) => {
            items.documents.push(convertToDocument(document));
        });
        obj['examQuestions']?.forEach((hit) => {
            items.examQuestions.push(convertToExamQuestionSearchHit(hit));
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
                setItems(NO_RESULTS);
                return;
            }

            const result = await request('GET', `/api/search?searchText=${encodeURIComponent(debouncedQuery)}`);
            if (!result) {
                setItems(NO_RESULTS);
                return;
            }

            setItems(convertToObjects(result));
        };

        fetchData();
    }, [debouncedQuery, request]);

    return (
        <Dialog
            transition
            className="relative z-[60]"
            open={open}
            onClose={() => {
                setOpen(false);
                setQuery('');
            }}
        >
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-neutral-900/25 transition-opacity data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150 data-enter:ease-out data-leave:ease-in"
            />

            <div className="fixed inset-0 z-[60] w-screen overflow-y-auto p-4 sm:p-6 sm:pt-[12vh]">
                <DialogPanel
                    transition
                    className="mx-auto max-w-[640px] transform overflow-hidden rounded-panel border border-border bg-surface shadow-dialog transition-all data-closed:scale-[0.98] data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150 data-enter:ease-out data-leave:ease-in"
                >
                    <Combobox
                        onChange={(param: { redirect: string } | null) => {
                            if (param?.redirect) {
                                setOpen(false);
                                setQuery('');
                                if (isOnThisPage(param.redirect)) {
                                    // router.push would change only the hash, with pushState, which
                                    // fires no hashchange: the exam page would neither scroll to
                                    // the question nor highlight it. Do what an anchor does.
                                    window.history.pushState(null, '', new URL(param.redirect, window.location.href).hash);
                                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                                } else {
                                    router.push(param.redirect);
                                }
                            }
                        }}
                    >
                        <div>
                            <div className="relative">
                                <SearchIcon
                                    className="pointer-events-none absolute left-4 top-4 size-[18px] text-icon"
                                    aria-hidden="true"
                                />
                                <ComboboxInput
                                    autoFocus
                                    className="h-[52px] w-full border-0 bg-transparent pl-11 pr-4 text-nav text-fg placeholder:text-fg-placeholder focus:ring-0"
                                    placeholder={t('search.placeholder')}
                                    onChange={(event) => setQuery(event.target.value)}
                                />
                            </div>

                            {loading && (
                                <div className="flex justify-center border-t border-border py-10">
                                    <svg className="animate-spin size-5 text-icon" xmlns="http://www.w3.org/2000/svg"
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
                                <div className="border-t border-border px-6 py-12 text-center text-body sm:px-14">
                                    <svg className="mx-auto animate-spin h-6 w-6 text-vtk-muted" xmlns="http://www.w3.org/2000/svg"
                                        fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    <p className="m-0 mt-3 font-semibold text-fg">{t('redirecting')}</p>
                                    <p className="m-0 mt-1 text-fg-muted">{t('session_expired')}</p>
                                </div>
                            )}

                            {error && !isRedirecting && (
                                <div className="border-t border-border px-6 py-12 text-center text-body sm:px-14">
                                    <Frown className="mx-auto size-5 text-icon" aria-hidden="true" />
                                    <p className="m-0 mt-3 font-semibold text-fg">{t('unexpected')}</p>
                                    <p className="m-0 mt-1 text-fg-muted">{error.message}</p>
                                </div>
                            )}

                            {!error && !isRedirecting && query.length <= 2 && (
                                <div className="border-t border-border px-6 py-12 text-center text-body sm:px-14">
                                    <Globe className="mx-auto size-5 text-icon" aria-hidden="true" />
                                    <p className="m-0 mt-3 font-semibold text-fg">{t('search.info')}</p>
                                    <p className="m-0 mt-1 text-fg-muted">{t('search.info_sub')}</p>
                                </div>
                            )}

                            {!error && !isRedirecting && query.length > 2 && Object.values(items).some(value => Array.isArray(value) && value.length > 0) && (
                                <div>
                                    <ComboboxOptions
                                        static
                                        as="ul"
                                        className="m-0 max-h-[min(60vh,560px)] scroll-pb-2 scroll-pt-11 space-y-1 overflow-y-auto border-t border-border p-2 pl-2"
                                    >
                                        {items.courses.length > 0 &&
                                            <FoldableSection key={'courses'} title={t('courses')} defaultOpen={true}>
                                                <li className="list-none">
                                                    <ul
                                                        className="m-0 mt-1 p-0 text-body text-fg"
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
                                                        className="m-0 mt-1 p-0 text-body text-fg"
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
                                                        className="m-0 mt-1 p-0 text-body text-fg"
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
                                                        className="m-0 mt-1 p-0 text-body text-fg"
                                                    >
                                                        {items.documents.map((document) => (
                                                            <DocumentSearchResult key={document.id} document={document} />
                                                        ))}
                                                    </ul>
                                                </li>
                                            </FoldableSection>
                                        }
                                        {items.examQuestions.length > 0 &&
                                            <FoldableSection key={'examQuestions'} title={t('search.exam_questions')} defaultOpen={true}>
                                                <li className="list-none">
                                                    <ul
                                                        className="m-0 mt-1 p-0 text-body text-fg"
                                                    >
                                                        {items.examQuestions.map((hit) => (
                                                            <ExamQuestionSearchResult key={`${hit.examId}-${hit.uid}`} hit={hit} />
                                                        ))}
                                                    </ul>
                                                </li>
                                            </FoldableSection>
                                        }
                                    </ComboboxOptions>
                                </div>
                            )}

                            {!error && !loading && !isRedirecting && query.length > 2 && Object.values(items).every(value => Array.isArray(value) && value.length === 0) && (
                                <div className="border-t border-border px-6 py-12 text-center text-body sm:px-14">
                                    <Frown className="mx-auto size-5 text-icon" aria-hidden="true" />
                                    <p className="m-0 mt-3 font-semibold text-fg">{t('search.no_results')}</p>
                                    <p className="m-0 mt-1 text-fg-muted">{t('search.no_results_sub')}</p>
                                </div>
                            )}
                        </div>
                    </Combobox>
                </DialogPanel>
            </div>
        </Dialog>
    )
}
