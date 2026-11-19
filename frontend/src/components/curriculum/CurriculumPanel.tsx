'use client';

import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import ResizeHandle from '@/components/layout/ResizeHandle';
import SlideColumn from '@/components/layout/SlideColumn';
import { useCurriculumPanel, useSidebarPanel, type PanelState } from '@/components/layout/ShellPanels';
import ShowSidebarButton from '@/components/layout/ShowSidebarButton';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/components/UserContext';
import { HydraCollection, readPreloadedApi, useApi } from '@/hooks/useApi';
import { useSiblingDocuments } from '@/hooks/useSiblingDocuments';
import { cn } from '@/lib/utils';
import type { Course, Document, DocumentCategory, Module, Program } from '@/types/entities';
import { convertToDocumentCategory, convertToModule, convertToProgram } from '@/utils/convertToEntity';
import { courseTitle } from '@/utils/courseName';
import { rememberBranch } from '@/utils/curriculumBranch';
import { treeProgramName } from '@/utils/curriculumLabels';
import {
    BookOpen,
    Check,
    ChevronRight,
    ChevronsUpDown,
    FileText,
    Files,
    Folder,
    GraduationCap,
    LoaderCircle,
    Search,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const PROGRAMS_ENDPOINT = '/api/programs?pagination=false&order[name]=asc';
const TREE_ENDPOINT = '/api/programs/tree?pagination=false&order[name]=asc';

/** Past this depth rows stop stepping right, or a deep branch runs out of column to indent into. */
const MAX_INDENT = 5;
/** Row padding before a top-level row's chevron. */
const BASE_PADDING = 4;
/** The leading chevron button of a top-level row. */
const CHEVRON_WIDTH = 20;
/** The gap between the chevron and the icon, which the link pads in front of its icon. */
const LINK_INSET = 2;
const ICON_SIZE = 16;
/** How far each level below the first steps in. */
const INDENT_STEP = 20;

/**
 * Where a row's icon starts. A nested row has no chevron in front of it, so the first level lines
 * its icon up under its parent's, and every level after that steps one further in. Reserving an
 * empty chevron slot on every row instead cost the names a fifth of a narrow column.
 */
function iconLeft(indent: number): number {
    return BASE_PADDING + CHEVRON_WIDTH + LINK_INSET + Math.max(0, indent - 1) * INDENT_STEP;
}

/** The guide down the children of a row at `level`: through its chevron at the top, its icon below. */
function guideLeft(level: number): number {
    return level === 0 ? BASE_PADDING + CHEVRON_WIDTH / 2 : iconLeft(level) + ICON_SIZE / 2;
}
const MAX_FILTER_RESULTS = 50;
/** How many files of the open folder to list around the one being read; the rest is one link away. */
const FOLDER_WINDOW = 8;

type NodeKey = string;
const moduleKey = (id: number): NodeKey => `m${id}`;
const courseKey = (id: number): NodeKey => `c${id}`;
const categoryKey = (id: number): NodeKey => `k${id}`;
const documentKey = (id: number): NodeKey => `d${id}`;

interface ModuleChildren {
    modules: Module[];
    courses: Course[];
}

interface FilterHit {
    course: Course;
    trail: string;
    leafModuleId: number;
}

/** Lower case without accents, so "energie" finds "Énergie" and "h04a0a" finds "H04A0A". */
function normalize(value: string | undefined) {
    return (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * The curriculum as a folder tree, in a column of its own inside the content panel.
 *
 * It only appears on curriculum pages and opens itself to wherever the reader is: the semester
 * the course belongs to, the courses beside it and the course's own folders. The programme at the
 * top can be switched to look around another one without leaving the page, and the filter finds a
 * course anywhere in that programme, also in branches that were never opened.
 */
export default function CurriculumPanel() {
    const panel = useCurriculumPanel();

    if (!panel.available) return null;

    return (
        <SlideColumn open={panel.open} width={panel.width} className="hidden lg:flex">
            <CurriculumColumn panel={panel} />
        </SlideColumn>
    );
}

function CurriculumColumn({ panel }: { panel: PanelState }) {
    const { t } = useTranslation();
    const columnRef = useRef<HTMLElement>(null);
    const sidebar = useSidebarPanel();
    const { activePath } = useCurriculumLocation();
    const programs = usePrograms();

    // Follows the page's programme, but the switcher may point it elsewhere until the reader
    // moves to a page in another programme. Adjusted during render, not in an effect, so the
    // tree never paints one frame of the previous programme.
    const activeProgramId = activePath?.program.id;
    const [browsingId, setBrowsingId] = useState<number | null>(activeProgramId ?? null);
    const [followedId, setFollowedId] = useState<number | undefined>(activeProgramId);
    if (activeProgramId !== undefined && activeProgramId !== followedId) {
        setFollowedId(activeProgramId);
        setBrowsingId(activeProgramId);
    }

    const browsing = programs.find((program) => program.id === browsingId)
        ?? (activePath?.program.id === browsingId ? activePath?.program : undefined);

    const [query, setQuery] = useState('');

    return (
        <aside
            ref={columnRef}
            aria-label={t('curriculum-tree.label')}
            style={{ width: panel.width }}
            className="relative flex shrink-0 flex-col border-r border-border bg-surface-muted"
        >
            <ResizeHandle panel={panel} targetRef={columnRef} label={t('curriculum-panel.resize')} />
            <div className={cn('flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b border-border pr-2.5', sidebar.open ? 'pl-4' : 'pl-3.5')}>
                <ShowSidebarButton />
                <h2 className="m-0 flex-1 text-body font-semibold text-fg">{t('curriculum-tree.label')}</h2>
                <button
                    type="button"
                    onClick={() => panel.setOpen(false)}
                    className="vtk-icon-button size-7!"
                    aria-label={t('curriculum-panel.hide')}
                    title={t('curriculum-panel.hide')}
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>

            <div className="flex shrink-0 flex-col gap-2 px-3 pt-3 pb-2">
                <ProgramSwitcher programs={programs} current={browsing} onSelect={(id) => setBrowsingId(id)} />
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-icon" aria-hidden="true" />
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }}
                        placeholder={t('curriculum-panel.filter')}
                        aria-label={t('curriculum-panel.filter')}
                        className="h-8 w-full rounded-control border border-border-strong bg-surface pr-7 pl-8 text-small text-fg shadow-xs placeholder:text-fg-placeholder focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-hidden"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-[6px] text-icon hover:bg-neutral-150 hover:text-fg"
                            aria-label={t('curriculum-panel.clear-filter')}
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-1 pb-3 scrollbar-thin">
                {browsingId === null ? (
                    <p className="m-0 px-2 py-2 text-small text-fg-muted">{t('curriculum-panel.choose-program')}</p>
                ) : query.trim() ? (
                    <FilterResults programId={browsingId} query={query} />
                ) : (
                    <ProgramTree programId={browsingId} />
                )}
            </div>
        </aside>
    );
}

function usePrograms(): Program[] {
    const { request } = useApi<HydraCollection<unknown>>();
    const [programs, setPrograms] = useState<Program[]>(() => {
        const preloaded = readPreloadedApi(PROGRAMS_ENDPOINT) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member'].map(convertToProgram) ?? [];
    });

    useEffect(() => {
        if (programs.length > 0) return;

        let cancelled = false;
        void (async () => {
            const result = await request('GET', PROGRAMS_ENDPOINT);
            if (cancelled) return;
            const members = result?.['hydra:member'];
            if (Array.isArray(members)) setPrograms(members.map(convertToProgram));
        })();

        return () => { cancelled = true; };
    }, [programs.length, request]);

    return programs;
}

function ProgramSwitcher({
    programs,
    current,
    onSelect,
}: {
    programs: Program[];
    current?: Program;
    onSelect: (id: number) => void;
}) {
    const { t } = useTranslation();
    const { user } = useUser();

    const favoriteIds = new Set(user?.favoritePrograms?.map((program) => program.id) ?? []);
    const favorites = programs.filter((program) => favoriteIds.has(program.id));
    const others = programs.filter((program) => !favoriteIds.has(program.id));

    const item = (program: Program) => (
        <DropdownMenuItem key={program.id} onSelect={() => onSelect(program.id)} title={program.name}>
            <Check className={program.id === current?.id ? undefined : 'invisible'} aria-hidden="true" />
            <span className="min-w-0 truncate">{treeProgramName(program.name)}</span>
        </DropdownMenuItem>
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="flex h-9 w-full items-center gap-2 rounded-control border border-border-strong bg-surface pr-2 pl-2.5 text-left text-small font-medium text-fg shadow-xs transition-colors hover:border-neutral-300 focus-visible:ring-2 focus-visible:ring-sky-100 focus-visible:outline-hidden data-[state=open]:border-neutral-300"
                title={current?.name}
                aria-label={t('curriculum-panel.switch-program')}
            >
                <GraduationCap className="size-4 shrink-0 text-icon-strong" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                    {current ? treeProgramName(current.name) : t('curriculum-panel.choose-program')}
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-icon" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="max-h-[min(28rem,70vh)] w-[var(--radix-dropdown-menu-trigger-width)] min-w-72 overflow-y-auto"
            >
                {favorites.length > 0 && (
                    <>
                        <DropdownMenuLabel>{t('curriculum-panel.favorite-programs')}</DropdownMenuLabel>
                        {favorites.map(item)}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{t('curriculum-panel.all-programs')}</DropdownMenuLabel>
                    </>
                )}
                {others.map(item)}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** One programme's modules, opened along the reader's own branch; deeper levels load on demand. */
function ProgramTree({ programId }: { programId: number }) {
    const { t, i18n } = useTranslation();
    const { request } = useApi<unknown>();
    const { module: currentModule, course, category, document: currentDocument, activePath } = useCurriculumLocation();

    const [programModules, setProgramModules] = useState<Record<number, Module[]>>({});
    const [moduleChildren, setModuleChildren] = useState<Record<number, ModuleChildren>>({});
    const [loadingKeys, setLoadingKeys] = useState<Set<NodeKey>>(new Set());
    const [expanded, setExpanded] = useState<Set<NodeKey>>(new Set());
    const inFlight = useRef<Set<NodeKey>>(new Set());

    const markLoading = useCallback((key: NodeKey, loading: boolean) => {
        setLoadingKeys((previous) => {
            const next = new Set(previous);
            if (loading) next.add(key); else next.delete(key);
            return next;
        });
    }, []);

    const loadProgram = useCallback(async (id: number) => {
        const key = `p${id}`;
        if (inFlight.current.has(key)) return;

        inFlight.current.add(key);
        markLoading(key, true);
        const data = await request('GET', `/api/programs/${id}`);
        inFlight.current.delete(key);
        markLoading(key, false);

        if (data) {
            setProgramModules((previous) => ({ ...previous, [id]: convertToProgram(data).modules ?? [] }));
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

    // Fetching on demand is what this effect is for; the only synchronous update is the spinner.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!programModules[programId]) void loadProgram(programId);
    }, [programId, programModules, loadProgram]);

    // Everything above the reader's own node opens for them, as long as the tree shows the
    // programme that node is in: arriving at a course from a search still shows its semester
    // and the courses next to it.
    const onBranch = activePath?.program.id === programId;
    const branchKeys = useMemo(() => {
        if (!onBranch || !activePath) return [];
        const keys = activePath.modules.map((node) => moduleKey(node.id));
        if (course) keys.push(courseKey(course.id));
        // On a document its folder opens too, listing the files beside it.
        if (course && category && currentDocument) keys.push(categoryKey(category.id));
        return keys;
    }, [onBranch, activePath, course, category, currentDocument]);

    const branchSignature = branchKeys.join('|');
    useEffect(() => {
        if (branchKeys.length === 0 || !activePath) return;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpanded((previous) => {
            const next = new Set(previous);
            branchKeys.forEach((key) => next.add(key));
            return next;
        });
        activePath.modules.forEach((node) => void loadModule(node.id));
        // branchSignature stands in for branchKeys and activePath, which are new objects on
        // renders that do not move the reader anywhere.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchSignature]);

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
    // "In this folder": only fetched while a document is open. The same request as the page's own
    // folder list, so it comes from the cache.
    const folder = useSiblingDocuments(
        currentDocument ? course?.id : undefined,
        currentDocument ? category?.id : undefined,
    );

    const activeKey: NodeKey | null = currentDocument ? documentKey(currentDocument.id)
        : category ? categoryKey(category.id)
        : course ? courseKey(course.id)
        : currentModule ? moduleKey(currentModule.id)
        : null;

    const modules = programModules[programId];
    if (!modules) {
        return (
            <div className="flex justify-center py-6">
                <LoaderCircle className="size-4 animate-spin text-icon" aria-hidden="true" />
            </div>
        );
    }

    if (modules.length === 0) {
        return <EmptyRow depth={0} label={t('curriculum-navigator.no-modules-in-program')} />;
    }

    const renderModule = (node: Module, depth: number): ReactNode => {
        const key = moduleKey(node.id);
        const isOpen = expanded.has(key);
        const children = moduleChildren[node.id];

        return (
            <li key={key}>
                <TreeRow
                    label={node.name ?? ''}
                    href={curriculumHref.module(node)}
                    apiEndpoints={`/api/modules/${node.id}`}
                    depth={depth}
                    icon={<Folder aria-hidden="true" />}
                    expandable
                    open={isOpen}
                    loading={loadingKeys.has(key)}
                    active={activeKey === key}
                    onToggle={() => toggle(key, () => void loadModule(node.id))}
                />
                {isOpen && children && (
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0 pt-0.5">
                        {children.modules.map((child) => renderModule(child, depth + 1))}
                        {children.courses.map((child) => renderCourse(child, depth + 1, node.id))}
                        {children.modules.length === 0 && children.courses.length === 0 && (
                            <li><EmptyRow depth={depth + 1} label={t('curriculum-navigator.no-courses-in-module')} /></li>
                        )}
                    </ul>
                )}
            </li>
        );
    };

    const renderCourse = (node: Course, depth: number, moduleId: number): ReactNode => {
        const key = courseKey(node.id);
        const isCurrent = course?.id === node.id;
        // Only the course being read opens into its folders: every course unfolding five
        // categories would bury the semester it sits in.
        const isOpen = isCurrent && expanded.has(key);
        const name = courseTitle(node) || node.code || '';

        return (
            <li key={key}>
                <TreeRow
                    label={name}
                    href={curriculumHref.course(node)}
                    apiEndpoints={[`/api/courses/${node.id}`, `/api/document_categories?lang=${i18n.language}`]}
                    depth={depth}
                    icon={<BookOpen aria-hidden="true" />}
                    expandable={isCurrent && categories.length > 0}
                    open={isOpen}
                    active={activeKey === key}
                    onToggle={() => toggle(key)}
                    onNavigate={() => rememberBranch(node.id, moduleId)}
                />
                {isOpen && (
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0 pt-0.5">
                        {categories.map((item) => {
                            const count = course?.documentCounts?.[item.id];
                            const key = categoryKey(item.id);
                            const href = `/course/${node.id}/documents/category/${item.id}`;
                            // Only the folder of the document being read lists its files.
                            const holdsDocument = currentDocument !== undefined && category?.id === item.id;
                            const folderOpen = holdsDocument && expanded.has(key);
                            return (
                                <li key={key}>
                                    <TreeRow
                                        label={item.name ?? ''}
                                        href={href}
                                        apiEndpoints={[
                                            `/api/courses/${node.id}?summary=true`,
                                            `/api/document_categories/${item.id}?lang=${i18n.language}`,
                                        ]}
                                        depth={depth + 1}
                                        icon={<Files aria-hidden="true" />}
                                        expandable={holdsDocument && folder.documents.length > 0}
                                        open={folderOpen}
                                        loading={holdsDocument && folder.loading && folder.documents.length === 0}
                                        active={activeKey === key}
                                        muted={count === 0}
                                        count={count}
                                        onToggle={() => toggle(key)}
                                    />
                                    {folderOpen && (
                                        <FolderDocuments
                                            documents={folder.documents}
                                            current={currentDocument}
                                            folderHref={href}
                                            depth={depth + 2}
                                            activeKey={activeKey}
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </li>
        );
    };

    return (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {modules.map((node) => renderModule(node, 0))}
        </ul>
    );
}

/**
 * The files in the folder of the document being read, a window around that document so the
 * neighbours are in view, and a link to the folder when there are more.
 */
function FolderDocuments({
    documents, current, folderHref, depth, activeKey,
}: {
    documents: Document[];
    current: Document;
    folderHref: string;
    depth: number;
    activeKey: NodeKey | null;
}) {
    const { t, i18n } = useTranslation();
    const index = Math.max(0, documents.findIndex((doc) => doc.id === current.id));
    const start = Math.max(0, Math.min(index - Math.floor(FOLDER_WINDOW / 2), documents.length - FOLDER_WINDOW));
    const shown = documents.slice(start, start + FOLDER_WINDOW);

    return (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0 pt-0.5">
            {shown.map((doc) => (
                <li key={documentKey(doc.id)}>
                    <TreeRow
                        label={doc.name ?? doc.filename ?? ''}
                        href={`/document/${doc.id}`}
                        apiEndpoints={[
                            `/api/documents/${doc.id}?lang=${i18n.language}`,
                            `/api/document_comments?document=/api/documents/${doc.id}`,
                        ]}
                        depth={depth}
                        icon={<FileText aria-hidden="true" />}
                        active={activeKey === documentKey(doc.id)}
                    />
                </li>
            ))}
            {documents.length > shown.length && (
                <li>
                    <ApiPrefetchLink
                        href={folderHref}
                        className="flex h-7 items-center rounded-[8px] pr-2 text-caption font-medium text-fg-muted hover:bg-sidebar-hover hover:text-fg"
                        style={{ paddingLeft: iconLeft(Math.min(depth, MAX_INDENT)) }}
                    >
                        {t('shell.show_all', { count: documents.length })}
                    </ApiPrefetchLink>
                </li>
            )}
        </ul>
    );
}

/** Courses anywhere in the programme whose name or code contains the query. */
function FilterResults({ programId, query }: { programId: number; query: string }) {
    const { t } = useTranslation();
    const { request } = useApi<HydraCollection<unknown>>();
    const [tree, setTree] = useState<Program[] | null>(null);
    const [failed, setFailed] = useState(false);

    // The whole curriculum in one request, fetched the first time someone filters. Opening the
    // tree branch by branch never needs it.
    useEffect(() => {
        if (tree) return;

        let cancelled = false;
        void (async () => {
            const result = await request('GET', TREE_ENDPOINT);
            if (cancelled) return;
            const members = result?.['hydra:member'];
            if (Array.isArray(members)) setTree(members.map(convertToProgram));
            else setFailed(true);
        })();

        return () => { cancelled = true; };
    }, [tree, request]);

    const hits = useMemo<FilterHit[]>(() => {
        const program = tree?.find((item) => item.id === programId);
        if (!program) return [];

        const needle = normalize(query.trim());
        const found: FilterHit[] = [];
        const seen = new Set<number>();

        const walk = (module: Module, trail: string[]) => {
            const path = [...trail, module.name ?? ''];
            module.courses?.forEach((item) => {
                if (seen.has(item.id)) return;
                const haystack = [item.nameNl, item.nameEn, item.name, item.code].map(normalize).join(' ');
                if (haystack.includes(needle)) {
                    seen.add(item.id);
                    found.push({ course: item, trail: path.join(' › '), leafModuleId: module.id });
                }
            });
            module.modules?.forEach((child) => walk(child, path));
        };
        program.modules?.forEach((module) => walk(module, []));

        return found.slice(0, MAX_FILTER_RESULTS);
    }, [tree, programId, query]);

    if (failed) {
        return <p className="m-0 px-2 py-2 text-small text-fg-muted">{t('unexpected')}</p>;
    }

    if (!tree) {
        return (
            <div className="flex justify-center py-6">
                <LoaderCircle className="size-4 animate-spin text-icon" aria-hidden="true" />
            </div>
        );
    }

    if (hits.length === 0) {
        return <p className="m-0 px-2 py-2 text-small text-fg-muted">{t('curriculum-navigator.no-courses')}</p>;
    }

    return (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-live="polite">
            {hits.map(({ course, trail, leafModuleId }) => {
                const name = courseTitle(course) || course.code || '';
                return (
                    <li key={course.id}>
                        <ApiPrefetchLink
                            href={curriculumHref.course(course)}
                            apiEndpoints={`/api/courses/${course.id}`}
                            onClick={() => rememberBranch(course.id, leafModuleId)}
                            className="flex items-start gap-2 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-hidden"
                            title={name}
                        >
                            <BookOpen className="mt-0.5 size-4 shrink-0 text-icon" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-small font-medium text-fg-nav">{name}</span>
                                <span className="block truncate text-caption text-fg-muted">{trail}</span>
                            </span>
                        </ApiPrefetchLink>
                    </li>
                );
            })}
        </ul>
    );
}

interface TreeRowProps {
    label: string;
    href: string;
    apiEndpoints?: string | string[];
    depth: number;
    icon: ReactNode;
    expandable?: boolean;
    open?: boolean;
    loading?: boolean;
    active?: boolean;
    muted?: boolean;
    count?: number;
    onToggle?: () => void;
    onNavigate?: () => void;
}

/**
 * One row: a chevron that only opens the branch, and a label that only navigates. Looking inside
 * a semester and going to it are different things, so they are different targets.
 *
 * A top-level row carries its chevron in front, like a folder in a file tree. A nested row carries
 * it behind the label, so its icon stays in line with its siblings' whether or not it opens.
 */
function TreeRow({
    label, href, apiEndpoints, depth, icon, expandable = false, open = false, loading = false,
    active = false, muted = false, count, onToggle, onNavigate,
}: TreeRowProps) {
    const { t } = useTranslation();
    const rowRef = useRef<HTMLDivElement>(null);
    const indent = Math.min(depth, MAX_INDENT);
    const leading = indent === 0;
    // The highlight starts just past the guide this row hangs from, so it never covers the guides
    // of the levels above it; a top-level row has none and fills the width.
    const highlightLeft = leading ? 0 : guideLeft(indent - 1) + 6;

    // Brings the reader's own row into view when they arrive, without fighting later scrolling.
    useEffect(() => {
        if (active) rowRef.current?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const chevron = expandable && (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={t(open ? 'curriculum-tree.collapse' : 'curriculum-tree.expand', { name: label })}
            className={cn(
                'relative grid h-7 shrink-0 place-items-center rounded-[6px] text-fg-placeholder hover:text-fg focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-hidden',
                leading ? 'w-5' : 'w-6',
            )}
        >
            {loading
                ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                : <ChevronRight className={cn('size-3.5 transition-transform duration-150', open && 'rotate-90')} strokeWidth={2.25} aria-hidden="true" />}
        </button>
    );

    return (
        <div
            ref={rowRef}
            className={cn(
                'group/row relative flex h-7 items-center pr-1.5 text-small',
                active ? 'font-medium text-fg' : muted ? 'text-fg-muted' : 'font-medium text-fg-nav',
            )}
            style={{ paddingLeft: leading ? BASE_PADDING : iconLeft(indent) - LINK_INSET }}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'pointer-events-none absolute inset-y-0 right-0 rounded-[8px] transition-colors',
                    active
                        ? 'bg-surface shadow-[0_0_0_1px_var(--color-border-strong),var(--shadow-xs)]'
                        : 'group-hover/row:bg-sidebar-hover',
                )}
                style={{ left: highlightLeft }}
            />
            {Array.from({ length: indent }, (_, level) => (
                <span
                    key={level}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-px bg-border-strong"
                    style={{ left: guideLeft(level) }}
                />
            ))}

            {leading && (chevron || <span className="w-5 shrink-0" aria-hidden="true" />)}

            <ApiPrefetchLink
                href={href}
                apiEndpoints={apiEndpoints}
                title={label}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
                className="relative flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-[6px] pl-0.5 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-hidden [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-icon"
            >
                {icon}
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {count !== undefined && count > 0 && (
                    <span className="shrink-0 text-caption font-medium text-fg-muted tabular">{count}</span>
                )}
            </ApiPrefetchLink>

            {!leading && chevron}
        </div>
    );
}

function EmptyRow({ depth, label }: { depth: number; label: string }) {
    return (
        <p
            className="m-0 py-1 pr-2 text-caption text-fg-muted italic"
            style={{ paddingLeft: iconLeft(Math.min(depth, MAX_INDENT)) }}
        >
            {label}
        </p>
    );
}

/** The document categories in the reader's language, fetched only while a course is open. */
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
