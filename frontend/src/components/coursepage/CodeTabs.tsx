'use client';

import { usePreloadedApi } from '@/components/ApiSeed';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { preloadApi, useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { Course } from '@/types/entities';
import { apiEndpoints } from '@/utils/apiEndpoints';
import { convertToCourse } from '@/utils/convertToEntity';
import { courseTitle } from '@/utils/courseName';
import { ArrowLeft, ArrowRight, ArrowUpRight, Equal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Relation = 'predecessors' | 'successors' | 'equivalents';
type Kind = 'documents' | 'evaluations';

export type CodeTab = {
    id: number;
    code: string;
    count: number;
    /** Absent for the course of the page itself. */
    relation?: Relation;
    /** The course as the page's payload knows it: for a related course only a summary. */
    course: Course;
};

const RELATIONS = [
    { key: 'predecessors', icon: ArrowLeft, of: (course: Course) => course.oldCourses },
    { key: 'successors', icon: ArrowRight, of: (course: Course) => course.newCourses },
    { key: 'equivalents', icon: Equal, of: (course: Course) => course.identicalCourses },
] as const;

const RELATION_ICON = Object.fromEntries(RELATIONS.map(({ key, icon }) => [key, icon])) as Record<Relation, typeof Equal>;

/**
 * One tab per code the subject has held material under: the course itself first, then every
 * former, later or equivalent code that holds documents or evaluations of its own. After a
 * curriculum reform that material usually lives on the old code, and a tab shows how much there
 * is right next to what the new one has, instead of a box above the list pointing elsewhere.
 *
 * A single tab means there is nothing elsewhere, and callers then draw no tab row at all.
 */
export function codeTabs(course: Course, kind: Kind, ownCount: number): CodeTab[] {
    const seen = new Set<number>([course.id]);
    const related: CodeTab[] = [];
    for (const { key, of } of RELATIONS) {
        for (const other of of(course) ?? []) {
            const count = (kind === 'documents' ? other.documentCount : other.commentCount) ?? 0;
            if (count === 0 || seen.has(other.id)) continue;
            seen.add(other.id);
            related.push({ id: other.id, code: other.code ?? courseTitle(other) ?? String(other.id), count, relation: key, course: other });
        }
    }
    return [{ id: course.id, code: course.code ?? courseTitle(course) ?? String(course.id), count: ownCount, course }, ...related];
}

/**
 * The tab to open on: the course's own, unless it has nothing yet while another code does - then
 * the code holding the most, so a freshly reformed course does not open on an empty section.
 */
export function defaultTabId(tabs: CodeTab[]): number {
    const [own, ...related] = tabs;
    if (own.count > 0 || related.length === 0) return own.id;
    return related.reduce((best, tab) => (tab.count > best.count ? tab : best)).id;
}

export default function CodeTabs({ tabs, activeId, onSelect, kind, panelId }: {
    tabs: CodeTab[];
    activeId: number;
    onSelect: (id: number) => void;
    kind: Kind;
    panelId: string;
}) {
    const { t } = useTranslation();
    const refs = useRef<(HTMLButtonElement | null)[]>([]);

    // The full course behind a tab is fetched only when it is opened; pointing at it starts
    // that request early, so a click usually lands on a filled list rather than a skeleton.
    const warm = (tab: CodeTab) => {
        if (tab.relation) preloadApi(apiEndpoints.course(tab.id));
    };

    // Arrow keys, Home and End move between tabs and select them, as a tablist does.
    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const targets: Record<string, number> = {
            ArrowRight: (index + 1) % tabs.length,
            ArrowLeft: (index - 1 + tabs.length) % tabs.length,
            Home: 0,
            End: tabs.length - 1,
        };
        const next = targets[event.key];
        if (next === undefined) return;
        event.preventDefault();
        refs.current[next]?.focus();
        onSelect(tabs[next].id);
    };

    return (
        <div
            role="tablist"
            aria-label={t(`course-page.related.tabs-${kind}`)}
            className="mb-3 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]"
        >
            {tabs.map((tab, index) => {
                const selected = tab.id === activeId;
                const name = courseTitle(tab.course);
                return (
                    <button
                        key={tab.id}
                        ref={(element) => { refs.current[index] = element; }}
                        id={tabIdFor(panelId, tab.id)}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={panelId}
                        tabIndex={selected ? 0 : -1}
                        title={name ? `${tab.code} ${name}` : tab.code}
                        onClick={() => onSelect(tab.id)}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        onPointerEnter={() => warm(tab)}
                        onFocus={() => warm(tab)}
                        className={cn(
                            '-mb-px inline-flex shrink-0 items-baseline gap-1.5 border-b-2 px-3 pt-1.5 pb-2 text-small transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
                            selected
                                ? 'border-primary font-medium text-fg'
                                : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg',
                        )}
                    >
                        <span className="tabular">{tab.code}</span>
                        <span className="text-caption font-normal text-fg-placeholder tabular">{tab.count}</span>
                        {tab.relation && (
                            <span className="text-caption font-normal text-fg-placeholder">
                                {t(`course-page.related.short.${tab.relation}`)}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/** The id of the tab for this course, for the panel's aria-labelledby. */
export const tabIdFor = (panelId: string, courseId: number) => `${panelId}-tab-${courseId}`;

/**
 * The full course behind a related tab: the page's payload only has a summary of it (code, name,
 * totals), not its folders or its evaluations. Null while it loads.
 */
export function useCourseById(id: number | null): { course: Course | null; failed: boolean } {
    const readPreloadedApi = usePreloadedApi();
    const endpoint = id === null ? null : apiEndpoints.course(id);
    const { request, error } = useApi();
    const [loaded, setLoaded] = useState<{ endpoint: string; course: Course } | null>(null);

    // What an earlier hover left in the cache draws on the very first frame of the switch.
    const cached = endpoint ? readPreloadedApi(endpoint) : undefined;
    const fromCache = useMemo(() => (cached ? convertToCourse(cached) : null), [cached]);

    const current = loaded?.endpoint === endpoint ? loaded.course : null;

    useEffect(() => {
        if (!endpoint || current || fromCache) return;
        let cancelled = false;
        request('GET', endpoint).then((data) => {
            if (!cancelled && data) setLoaded({ endpoint, course: convertToCourse(data) });
        });
        return () => { cancelled = true; };
    }, [endpoint, current, fromCache, request]);

    return { course: current ?? fromCache, failed: Boolean(error) && !current && !fromCache };
}

/**
 * The line above a related code's material: what that code is to this course, and its own page,
 * which holds what a tab here leaves out (writing an evaluation, its exams).
 */
export function RelatedTabNote({ tab, hash = '' }: { tab: CodeTab; hash?: string }) {
    const { t, i18n } = useTranslation();
    if (!tab.relation) return null;
    const Icon = RELATION_ICON[tab.relation];
    const name = courseTitle(tab.course);

    return (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-fg-muted">
            <span className="inline-flex min-w-0 items-center gap-1.5">
                <Icon className="size-3.5 shrink-0 text-icon" aria-hidden="true" />
                <span className="min-w-0">
                    {t(`course-page.related.${tab.relation}`)}{' '}
                    <span className="tabular">{tab.code}</span>
                    {name && <span className="ml-1.5 font-medium text-fg">{name}</span>}
                </span>
            </span>
            <ApiPrefetchLink
                href={`/course/${tab.id}${hash}`}
                apiEndpoints={[apiEndpoints.course(tab.id), apiEndpoints.documentCategories(i18n.language)]}
                className="inline-flex items-center gap-1 font-medium text-link hover:underline"
            >
                {t('course-page.related.open-course')}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </ApiPrefetchLink>
        </div>
    );
}

/** Shown when a related course could not be fetched: its page is still one click away. */
export function RelatedTabError({ tab }: { tab: CodeTab }) {
    const { t } = useTranslation();
    return (
        <div className="vtk-panel vtk-empty">{t('course-page.related.load-error', { code: tab.code })}</div>
    );
}
