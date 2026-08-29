'use client';

import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { useUser } from '@/components/UserContext';
import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import { useSiblingDocuments } from '@/hooks/useSiblingDocuments';
import type { Course, DocumentCategory, Module, Program } from '@/types/entities';
import { convertToDocumentCategory, convertToModule, convertToProgram } from '@/utils/convertToEntity';
import { localizedCourseName } from '@/utils/courseName';
import { shortProgramName } from '@/utils/curriculumLabels';
import { ChevronRight, File, FileText, Folder, GraduationCap, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type NodeKey = string;

const programKey = (id: number): NodeKey => `p${id}`;
const moduleKey = (id: number): NodeKey => `m${id}`;
const courseKey = (id: number): NodeKey => `c${id}`;
const categoryKey = (id: number): NodeKey => `k${id}`;

/** Past this depth rows stop stepping right, or a deep branch runs out of rail to indent into. */
const MAX_INDENT = 5;

interface ModuleChildren {
    modules: Module[];
    courses: Course[];
}

/**
 * The whole curriculum as one folder tree, the way the old Burgieclan had it down the side.
 *
 * This is the navigator, not a decoration next to one: every programme, module and course is
 * reachable from here without going back to a listing page first, which is what "je moet veel
 * te veel doorklikken" was about. It opens itself to wherever the reader is, so the answer to
 * "which branch am I in" is on screen rather than one click away, and stepping to the next
 * course or the next semester is one click from anywhere.
 */
export default function CurriculumTree() {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { request } = useApi<unknown>();
    const { program, module, course, category, document, paths, activePath } = useCurriculumLocation();

    const programsEndpoint = '/api/programs?pagination=false&order[name]=asc';
    const [programs, setPrograms] = useState<Program[]>(() => {
        const preloaded = readPreloadedApi(programsEndpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member'].map(convertToProgram) ?? [];
    });
    const [programChildren, setProgramChildren] = useState<Record<number, Module[]>>({});
    const [moduleChildren, setModuleChildren] = useState<Record<number, ModuleChildren>>({});
    const [loadingKeys, setLoadingKeys] = useState<Set<NodeKey>>(new Set());
    const [expanded, setExpanded] = useState<Set<NodeKey>>(new Set());
    const inFlight = useRef<Set<NodeKey>>(new Set());

    // The endpoint is already alphabetic. A stable favourite-first sort pins the reader's own
    // programmes without disturbing the useful alphabetical order inside either group.
    const orderedPrograms = useMemo(() => {
        const favoriteIds = new Set(user?.favoritePrograms?.map((item) => item.id) ?? []);
        return [...programs].sort((left, right) =>
            Number(favoriteIds.has(right.id)) - Number(favoriteIds.has(left.id))
        );
    }, [programs, user?.favoritePrograms]);

    useEffect(() => {
        if (programs.length > 0) return;

        let cancelled = false;

        void (async () => {
            const result = await request('GET', programsEndpoint) as HydraCollection<unknown> | null;
            if (cancelled) return;

            const members = result?.['hydra:member'];
            setPrograms(Array.isArray(members) ? members.map(convertToProgram) : []);
        })();

        return () => { cancelled = true; };
    }, [programs.length, programsEndpoint, request]);

    const markLoading = useCallback((key: NodeKey, loading: boolean) => {
        setLoadingKeys((previous) => {
            const next = new Set(previous);
            if (loading) {
                next.add(key);
            } else {
                next.delete(key);
            }
            return next;
        });
    }, []);

    const loadProgram = useCallback(async (id: number) => {
        const key = programKey(id);
        if (inFlight.current.has(key)) return;

        inFlight.current.add(key);
        markLoading(key, true);
        const data = await request('GET', `/api/programs/${id}`);
        inFlight.current.delete(key);
        markLoading(key, false);

        if (data) {
            setProgramChildren((previous) => ({ ...previous, [id]: convertToProgram(data).modules ?? [] }));
        }
    }, [request, markLoading]);

    const loadModule = useCallback(async (id: number) => {
        const key = moduleKey(id);
        if (inFlight.current.has(key)) return;

        inFlight.current.add(key);
        markLoading(key, true);
        const data = await request('GET', `/api/modules/${id}`);
        inFlight.current.delete(key);
        markLoading(key, false);

        if (data) {
            const loaded = convertToModule(data);
            setModuleChildren((previous) => ({
                ...previous,
                [id]: { modules: loaded.modules ?? [], courses: loaded.courses ?? [] },
            }));
        }
    }, [request, markLoading]);

    // Everything above the reader's own node is opened for them: arriving at a course from a
    // search should still show the semester it belongs to and the courses beside it.
    const branchKeys = useMemo(() => {
        const keys: NodeKey[] = [];
        if (activePath) {
            keys.push(programKey(activePath.program.id));
            activePath.modules.forEach((node) => keys.push(moduleKey(node.id)));
        }
        if (course) keys.push(courseKey(course.id));
        if (category) keys.push(categoryKey(category.id));
        return keys;
    }, [activePath, course, category]);

    // A shared course may occur in several programmes. Keep only its active placement open:
    // otherwise an earlier/manual expansion shows the current course a second time and makes it
    // look as if two curriculum branches are active at once.
    const alternativeBranchKeys = useMemo(() => {
        if (!activePath || paths.length < 2) return [];

        const activeKeys = new Set<NodeKey>([
            programKey(activePath.program.id),
            ...activePath.modules.map((node) => moduleKey(node.id)),
        ]);
        const alternatives = new Set<NodeKey>();

        paths.forEach((path) => {
            const keys = [
                programKey(path.program.id),
                ...path.modules.map((node) => moduleKey(node.id)),
            ];
            keys.forEach((key) => {
                if (!activeKeys.has(key)) alternatives.add(key);
            });
        });

        return [...alternatives];
    }, [activePath, paths]);

    const branchSignature = branchKeys.join('|');
    const alternativeBranchSignature = alternativeBranchKeys.join('|');
    useEffect(() => {
        if (branchKeys.length === 0) return;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpanded((previous) => {
            const next = new Set(previous);
            alternativeBranchKeys.forEach((key) => next.delete(key));
            branchKeys.forEach((key) => next.add(key));
            return next;
        });

        if (activePath) {
            void loadProgram(activePath.program.id);
            activePath.modules.forEach((node) => void loadModule(node.id));
        }
        // branchSignature stands in for branchKeys: a new array each render would re-run this
        // on every keystroke elsewhere in the app.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchSignature, alternativeBranchSignature]);

    const toggle = useCallback((key: NodeKey, load?: () => void) => {
        setExpanded((previous) => {
            const next = new Set(previous);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
                load?.();
            }
            return next;
        });
    }, []);

    const categories = useDocumentCategories(course !== undefined);
    const { documents } = useSiblingDocuments(
        category ? course?.id : undefined,
        category ? category.id : undefined
    );

    const activeKey = document
        ? `d${document.id}`
        : category
            ? categoryKey(category.id)
            : course
                ? courseKey(course.id)
                : module
                    ? moduleKey(module.id)
                    : program
                        ? programKey(program.id)
                        : null;

    if (programs.length === 0) {
        return (
            <div className="flex shrink-0 justify-center py-6">
                <LoaderCircle className="animate-spin text-vtk-muted" size={16} />
            </div>
        );
    }

    const renderModule = (node: Module, depth: number) => {
        const key = moduleKey(node.id);
        const isOpen = expanded.has(key);
        const children = moduleChildren[node.id];

        return (
            <div key={key} className="shrink-0">
                <TreeRow
                    label={node.name ?? ''}
                    href={curriculumHref.module(node)}
                    apiEndpoints={`/api/modules/${node.id}`}
                    depth={depth}
                    icon={Folder}
                    open={isOpen}
                    expandable
                    active={activeKey === key}
                    loading={loadingKeys.has(key)}
                    onToggle={() => toggle(key, () => void loadModule(node.id))}
                />
                {isOpen && children && (
                    <>
                        {children.modules.map((child) => renderModule(child, depth + 1))}
                        {children.courses.map((child) => renderCourse(child, depth + 1))}
                        {children.modules.length === 0 && children.courses.length === 0 && (
                            <EmptyRow depth={depth + 1} label={t('curriculum-navigator.no-courses-in-module')} />
                        )}
                    </>
                )}
            </div>
        );
    };

    const renderCourse = (node: Course, depth: number) => {
        const key = courseKey(node.id);
        const isCurrent = course?.id === node.id;
        const isOpen = expanded.has(key) && isCurrent;

        return (
            <div key={key} className="shrink-0">
                <TreeRow
                    label={localizedCourseName(node, i18n.language) ?? node.code ?? ''}
                    href={curriculumHref.course(node)}
                    apiEndpoints={[
                        `/api/courses/${node.id}`,
                        `/api/document_categories?lang=${i18n.language}`,
                    ]}
                    depth={depth}
                    icon={FileText}
                    open={isOpen}
                    active={activeKey === key}
                />
                {/* Only the course being read opens into its folders: every course on screen
                    unfolding its five categories would bury the tree it sits in. */}
                {isOpen && categories.map((item) => {
                    const itemKey = categoryKey(item.id);
                    const isCurrentCategory = category?.id === item.id;

                    return (
                        <div key={itemKey} className="shrink-0">
                            <TreeRow
                                label={item.name ?? ''}
                                href={`/course/${node.id}/documents/category/${item.id}`}
                                apiEndpoints={[
                                    `/api/courses/${node.id}?summary=true`,
                                    `/api/document_categories/${item.id}?lang=${i18n.language}`,
                                ]}
                                depth={depth + 1}
                                icon={Folder}
                                open={isCurrentCategory}
                                active={activeKey === itemKey}
                                badge={course?.documentCounts?.[item.id]}
                            />
                            {isCurrentCategory && documents.map((file) => (
                                <TreeRow
                                    key={`d${file.id}`}
                                    label={file.name ?? file.filename ?? ''}
                                    href={`/document/${file.id}`}
                                    apiEndpoints={[
                                        `/api/documents/${file.id}?lang=${i18n.language}`,
                                        `/api/document_comments?document=/api/documents/${file.id}`,
                                    ]}
                                    depth={depth + 2}
                                    icon={File}
                                    active={activeKey === `d${file.id}`}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <nav aria-label={t('curriculum-tree.label')} className="flex shrink-0 flex-col">
            {orderedPrograms.map((node) => {
                const key = programKey(node.id);
                const isOpen = expanded.has(key);
                const modules = programChildren[node.id];

                return (
                    <div key={key} className="shrink-0">
                        <TreeRow
                            label={shortProgramName(node.name)}
                            title={node.name}
                            href={curriculumHref.program(node)}
                            apiEndpoints={`/api/programs/${node.id}`}
                            depth={0}
                            icon={GraduationCap}
                            open={isOpen}
                            expandable
                            active={activeKey === key}
                            loading={loadingKeys.has(key)}
                            onToggle={() => toggle(key, () => void loadProgram(node.id))}
                        />
                        {isOpen && modules && (
                            modules.length > 0
                                ? modules.map((child) => renderModule(child, 1))
                                : <EmptyRow depth={1} label={t('curriculum-navigator.no-modules-in-program')} />
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

interface TreeRowProps {
    label: string;
    title?: string;
    href: string;
    apiEndpoints?: string | string[];
    depth: number;
    icon: typeof Folder;
    open?: boolean;
    expandable?: boolean;
    active?: boolean;
    loading?: boolean;
    badge?: number;
    onToggle?: () => void;
}

/**
 * One row: a chevron that only opens the branch, and a label that only navigates.
 *
 * Keeping them apart is the point. In the old accordion the name *was* the toggle, so looking
 * inside a programme and going to it were the same gesture and neither could be done without
 * the other.
 */
function TreeRow({
    label, title, href, apiEndpoints, depth, icon: Icon, open = false,
    expandable = false, active = false, loading = false, badge, onToggle,
}: TreeRowProps) {
    const { t } = useTranslation();
    const rowRef = useRef<HTMLDivElement>(null);
    const scrolled = useRef(false);

    // Once only: re-scrolling on every render would fight the reader for the viewport.
    useEffect(() => {
        if (active && !scrolled.current) {
            scrolled.current = true;
            rowRef.current?.scrollIntoView({ block: 'nearest' });
        }
    }, [active]);

    return (
        <div
            ref={rowRef}
            className={`flex min-h-8 shrink-0 items-center rounded-md pr-1 text-[13px] leading-snug transition-colors ${active
                ? 'bg-vtk-paper-2 font-semibold text-vtk-ink shadow-[inset_2px_0_0_var(--yellow)]'
                : 'text-vtk-body hover:bg-vtk-paper-2'
                }`}
            style={{ paddingLeft: `${Math.min(depth, MAX_INDENT) * 0.7}rem` }}
        >
            {expandable ? (
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-label={t(open ? 'curriculum-tree.collapse' : 'curriculum-tree.expand', { name: label })}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded text-vtk-muted hover:text-vtk-ink focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vtk-navy"
                >
                    {loading
                        ? <LoaderCircle size={15} className="animate-spin" />
                        : <ChevronRight size={17} strokeWidth={2.25} className="transition-transform duration-150" style={{ transform: open ? 'rotate(90deg)' : 'none' }} />}
                </button>
            ) : (
                <span className="h-8 w-8 shrink-0" aria-hidden="true" />
            )}

            <ApiPrefetchLink
                href={href}
                apiEndpoints={apiEndpoints}
                title={title ?? label}
                aria-current={active ? 'page' : undefined}
                className="flex min-w-0 self-stretch flex-1 items-center gap-1.5 pr-1 rounded focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
            >
                <Icon size={14} className="shrink-0 text-vtk-muted" aria-hidden="true" />
                {/* A file tree is easiest to scan when every item owns exactly one row. The full
                    name remains available through the link's title. */}
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {badge !== undefined && badge > 0 && (
                    <span className="shrink-0 text-[11px] tabular-nums text-vtk-muted">{badge}</span>
                )}
            </ApiPrefetchLink>
        </div>
    );
}

function EmptyRow({ depth, label }: { depth: number; label: string }) {
    return (
        <div
            className="shrink-0 py-1 text-[12px] italic text-vtk-muted"
            style={{ paddingLeft: `${Math.min(depth, MAX_INDENT) * 0.7 + 1.25}rem` }}
        >
            {label}
        </div>
    );
}

/** The document categories, in the reader's language, fetched only when the tree draws them. */
function useDocumentCategories(enabled: boolean): DocumentCategory[] {
    const { request } = useApi<HydraCollection<unknown>>();
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const { i18n } = useTranslation();
    const language = i18n.language;

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        void (async () => {
            const result = await request('GET', `/api/document_categories?lang=${language}`);
            if (cancelled) return;

            const members = result?.['hydra:member'];
            setCategories(Array.isArray(members) ? members.map(convertToDocumentCategory) : []);
        })();

        return () => { cancelled = true; };
    }, [enabled, language, request]);

    return categories;
}
