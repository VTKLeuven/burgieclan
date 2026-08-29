'use client';

import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import { HydraCollection, useApi } from '@/hooks/useApi';
import { useSiblingDocuments } from '@/hooks/useSiblingDocuments';
import type { Course, DocumentCategory, Module } from '@/types/entities';
import { convertToDocumentCategory, convertToModule } from '@/utils/convertToEntity';
import { localizedCourseName } from '@/utils/courseName';
import { rememberBranch } from '@/utils/curriculumBranch';
import { File, FolderClosed, FolderOpen, GraduationCap, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Indentation is capped so a deeply nested branch does not push its own leaves off a 288px
 * rail. Past the cap the rows sit at the same depth and the tree relies on the icons and the
 * highlight to say where the reader is.
 */
const MAX_INDENT_LEVEL = 4;

interface TreeRowProps {
    label: string;
    href: string;
    level: number;
    icon: 'program' | 'folder' | 'course' | 'document';
    open?: boolean;
    active?: boolean;
    badge?: number;
    onClick?: () => void;
}

function TreeRow({ label, href, level, icon, open = false, active = false, badge, onClick }: TreeRowProps) {
    const rowRef = useRef<HTMLAnchorElement>(null);
    const scrolled = useRef(false);

    // A course with many neighbours or a folder with a decade of scans puts the active row
    // below the fold. Once only: re-scrolling on every render would fight the reader.
    useEffect(() => {
        if (active && !scrolled.current) {
            scrolled.current = true;
            rowRef.current?.scrollIntoView({ block: 'nearest' });
        }
    }, [active]);

    const Icon = icon === 'program'
        ? GraduationCap
        : icon === 'document'
            ? File
            : open ? FolderOpen : FolderClosed;

    return (
        <Link
            ref={rowRef}
            href={href}
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            title={label}
            style={{ paddingLeft: `${0.5 + Math.min(level, MAX_INDENT_LEVEL) * 0.75}rem` }}
            className={`flex items-center gap-2 rounded-lg py-1.5 pr-2 text-[13px] leading-snug transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy ${active
                ? 'bg-vtk-paper-2 font-semibold text-vtk-ink shadow-[inset_2px_0_0_var(--yellow)]'
                : 'text-vtk-body hover:bg-vtk-paper-2 hover:text-vtk-ink'
                }`}
        >
            <Icon size={14} className="shrink-0 text-vtk-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="shrink-0 text-[11px] tabular-nums text-vtk-muted">{badge}</span>
            )}
        </Link>
    );
}

/**
 * The folder tree the old Burgieclan had down the side, rebuilt on top of the curriculum:
 * programme → modules → courses → categories → documents, opened to wherever the reader is
 * and showing the neighbours at every level.
 *
 * It answers the two things the tabbed navigator could not. Which branch am I in - a course
 * page reached from a search or a favourite carries no programme in its URL, so the page had
 * no way of saying whether this was the right "Beton" out of three. And where do I go next -
 * stepping from exercise session 1 to 2 meant walking back up through the folder every time.
 *
 * Everything below the programme is a link into a real page, so nothing here is a dead end:
 * a programme or module row opens the navigator on that node.
 */
export default function CurriculumTree() {
    const { t, i18n } = useTranslation();
    const { course, category, document, paths, activePath, pathsLoading } = useCurriculumLocation();

    // Sibling courses come from the module that teaches this one; sibling categories and
    // documents only matter once the reader is inside a folder, so neither is fetched on a
    // course page - the page body already lists the categories as cards there.
    const leafModuleId = activePath?.modules.at(-1)?.id;
    const siblingCourses = useModuleCourses(leafModuleId);
    const categories = useDocumentCategories(category !== undefined);
    const { documents: siblingDocuments } = useSiblingDocuments(
        document ? course?.id : undefined,
        document ? category?.id : undefined
    );

    if (!course) {
        return null;
    }

    const countFor = (item: DocumentCategory) => course.documentCounts?.[item.id] ?? 0;

    // Until the module answers, the reader's own course stands in for the list of neighbours -
    // and it stays in it if the module somehow comes back without it, because a tree that does
    // not contain where you are is worse than no tree.
    const courseRows = siblingCourses?.some((sibling) => sibling.id === course.id)
        ? siblingCourses
        : [course];

    return (
        <nav aria-label={t('curriculum-tree.label')} className="flex min-h-0 flex-col">
            <div className="vtk-label px-2.5 pb-1.5">{t('curriculum-tree.label')}</div>

            {pathsLoading && paths.length === 0 ? (
                <div className="flex justify-center py-4">
                    <LoaderCircle className="animate-spin text-vtk-muted" size={16} />
                </div>
            ) : (
                <div className="flex flex-col">
                    {activePath ? (
                        <>
                            <TreeRow
                                label={activePath.program.name ?? ''}
                                href={`/courses?program=${activePath.program.id}`}
                                level={0}
                                icon="program"
                                open
                            />
                            {activePath.modules.map((module, index) => (
                                <TreeRow
                                    key={module.id}
                                    label={module.name ?? ''}
                                    href={`/courses?module=${module.id}`}
                                    level={index + 1}
                                    icon="folder"
                                    open
                                />
                            ))}
                        </>
                    ) : (
                        // A course no programme reaches still deserves a way back up.
                        <TreeRow label={t('courses')} href="/courses" level={0} icon="folder" open />
                    )}

                    {courseRows.map((sibling) => {
                        const isCurrent = sibling.id === course.id;
                        const courseLevel = activePath ? activePath.modules.length + 1 : 1;

                        return (
                            <div key={sibling.id} className="contents">
                                <TreeRow
                                    label={localizedCourseName(sibling, i18n.language) ?? sibling.code ?? ''}
                                    href={`/course/${sibling.id}`}
                                    level={courseLevel}
                                    icon="course"
                                    open={isCurrent && categories.length > 0}
                                    active={isCurrent && !category}
                                    // Stepping sideways to a neighbour keeps the branch: without this the
                                    // next page would fall back to that course's first placement, which
                                    // for a shared course is a different programme than the one on screen.
                                    onClick={leafModuleId ? () => rememberBranch(sibling.id, leafModuleId) : undefined}
                                />

                                {isCurrent && categories.map((item) => {
                                    const isCurrentCategory = item.id === category?.id;

                                    return (
                                        <div key={item.id} className="contents">
                                            <TreeRow
                                                label={item.name ?? ''}
                                                href={`/course/${course.id}/documents/category/${item.id}`}
                                                level={courseLevel + 1}
                                                icon="folder"
                                                open={isCurrentCategory}
                                                active={isCurrentCategory && !document}
                                                badge={countFor(item)}
                                            />

                                            {isCurrentCategory && siblingDocuments.map((file) => (
                                                <TreeRow
                                                    key={file.id}
                                                    label={file.name ?? file.filename ?? ''}
                                                    href={`/document/${file.id}`}
                                                    level={courseLevel + 2}
                                                    icon="document"
                                                    active={file.id === document?.id}
                                                />
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </nav>
    );
}

/** The courses taught by one module, or null while the module has not been loaded. */
function useModuleCourses(moduleId?: number): Course[] | null {
    const { request } = useApi<unknown>();
    const [courses, setCourses] = useState<Course[] | null>(null);

    useEffect(() => {
        if (moduleId === undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCourses(null);
            return;
        }

        let cancelled = false;

        const fetchModule = async () => {
            const data = await request('GET', `/api/modules/${moduleId}`);
            if (cancelled) return;

            const loaded: Module | null = data ? convertToModule(data) : null;
            setCourses(loaded?.courses ?? null);
        };

        void fetchModule();

        return () => {
            cancelled = true;
        };
    }, [moduleId, request]);

    return courses;
}

/**
 * The document categories, in the reader's language. Fetched only when the tree actually
 * draws them - on a course page the page body already lists them as cards.
 */
function useDocumentCategories(enabled: boolean): DocumentCategory[] {
    const { request } = useApi<HydraCollection<unknown>>();
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const { i18n } = useTranslation();
    const language = i18n.language;

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const fetchCategories = async () => {
            const result = await request('GET', `/api/document_categories?lang=${language}`);
            if (cancelled) return;

            const members = result?.['hydra:member'];
            setCategories(Array.isArray(members) ? members.map(convertToDocumentCategory) : []);
        };

        void fetchCategories();

        return () => {
            cancelled = true;
        };
    }, [enabled, language, request]);

    return categories;
}
