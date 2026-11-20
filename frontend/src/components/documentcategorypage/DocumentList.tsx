import DocumentFilter from '@/components/documentcategorypage/DocumentFilter';
import DocumentSection from '@/components/documentcategorypage/DocumentSection';
import DocumentSort from '@/components/documentcategorypage/DocumentSort';
import DownloadButton from '@/components/ui/DownloadButton';
import { DocumentFilters, DocumentSortOptions } from '@/hooks/useRetrieveDocuments';
import type { Course, Document, DocumentCategory, Tag } from '@/types/entities';
import { courseTitle } from '@/utils/courseName';
import { X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_TAG_CHIPS = 8;
const AUTO_OPEN_OLDER_THRESHOLD = 5;

function sameTagList(prev: Tag[] | undefined, next: Tag[]): boolean {
    if (!prev || prev.length !== next.length) {
        return false;
    }
    for (let i = 0; i < prev.length; i += 1) {
        if (prev[i].id !== next[i].id || prev[i].name !== next[i].name || prev[i].hidden !== next[i].hidden) {
            return false;
        }
    }
    return true;
}

interface DocumentListProps {
    course?: Course;
    category?: DocumentCategory;
    /** Extra controls at the right end of the toolbar, e.g. a link to the folder's own page. */
    toolbarEnd?: React.ReactNode;
    /** How many documents the folder is known to hold, so the skeleton has the list's height. */
    expectedCount?: number;
}

/**
 * A folder of one course, the way the old Burgieclan folder showed it: the course's own files
 * first, then the files of the courses it replaced.
 *
 * - "This course" also lists the identical courses (the same subject under another code, e.g.
 *   the Dutch and English version), because a student cannot tell them apart. A Seafile file
 *   on both is shown once.
 * - Every older course gets its own collapsible section, named by its code, so a 2015 exam of
 *   H01S4A stays recognisable as such instead of mixing in with the current course's.
 *
 * Filters, sorting and the download selection apply to every section at once. A course
 * without identical or older courses renders exactly one section, without headings.
 */
const DocumentList: React.FC<DocumentListProps> = ({ course, category, toolbarEnd, expectedCount }) => {
    const { t } = useTranslation();
    const [filters, setFilters] = useState<DocumentFilters>({});
    // Newest academic year first, so a course that has been collecting notes for a
    // decade opens on the material that is still relevant. `year` is stored as
    // "2024 - 2025", which sorts correctly as a string; files without a year come last.
    const [sort, setSort] = useState<DocumentSortOptions>({ field: 'year', direction: 'desc' });
    const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
    const [selectedPart, setSelectedPart] = useState<string | null>(null);
    const [ownTotal, setOwnTotal] = useState<number | null>(null);
    const [olderTotals, setOlderTotals] = useState<Record<number, number>>({});
    const scopeKey = `${course?.id ?? ''}:${category?.id ?? ''}`;
    const [tagsState, setTagsState] = useState<{ scopeKey: string; bySection: Record<string, Tag[]> }>({
        scopeKey,
        bySection: {},
    });
    const sectionTags = useMemo(
        () => (tagsState.scopeKey === scopeKey ? tagsState.bySection : {}),
        [tagsState, scopeKey],
    );

    const activeTagIds = filters.tagIds ?? [];
    const hasActiveTagFilter = activeTagIds.length > 0 || (filters.tagNames?.length ?? 0) > 0;
    const hasActiveTagFilterRef = useRef(hasActiveTagFilter);
    useEffect(() => {
        hasActiveTagFilterRef.current = hasActiveTagFilter;
    }, [hasActiveTagFilter]);

    const courseParts = useMemo(() => course?.parts ?? [], [course?.parts]);
    const activePart = selectedPart && courseParts.includes(selectedPart) ? selectedPart : null;

    const handlePartChange = (part: string | null) => {
        setSelectedPart(part);
        setSelectedDocuments([]);
    };

    const ownCourses = useMemo(
        () => (course ? [course, ...(course.identicalCourses ?? []).filter((c) => c.id !== course.id)] : []),
        [course],
    );
    const olderCourses = useMemo(() => course?.oldCourses ?? [], [course]);

    // Returns the same object when nothing changed, so a section reporting its total on every
    // render does not re-render the list in a loop.
    const reportOlderTotal = useCallback((courseId: number, total: number) => {
        setOlderTotals((prev) => (prev[courseId] === total ? prev : { ...prev, [courseId]: total }));
    }, []);

    // Keep the unfiltered tag frequencies across sections so clicking a chip does not make
    // the sibling chips disappear while the reader is switching between them.
    const reportSectionTags = useCallback((sectionKey: string, tags: Tag[]) => {
        if (hasActiveTagFilterRef.current) {
            return;
        }
        setTagsState((prev) => {
            const base = prev.scopeKey === scopeKey ? prev.bySection : {};
            if (sameTagList(base[sectionKey], tags)) {
                return prev.scopeKey === scopeKey ? prev : { scopeKey, bySection: base };
            }
            return { scopeKey, bySection: { ...base, [sectionKey]: tags } };
        });
    }, [scopeKey]);

    const reportOwnTags = useCallback(
        (tags: Tag[]) => reportSectionTags('own', tags),
        [reportSectionTags],
    );

    const reportOlderTags = useCallback(
        (courseId: number, tags: Tag[]) => reportSectionTags(String(courseId), tags),
        [reportSectionTags],
    );

    const topTags = useMemo(() => {
        const counts = new Map<number, { tag: Tag; count: number }>();
        for (const tags of Object.values(sectionTags)) {
            for (const tag of tags) {
                if (tag.hidden || !tag.name) {
                    continue;
                }
                const existing = counts.get(tag.id);
                if (existing) {
                    existing.count += 1;
                } else {
                    counts.set(tag.id, { tag, count: 1 });
                }
            }
        }
        return Array.from(counts.values())
            .sort((a, b) => b.count - a.count || (a.tag.name ?? '').localeCompare(b.tag.name ?? ''))
            .slice(0, MAX_TAG_CHIPS)
            .map((entry) => entry.tag);
    }, [sectionTags]);

    const isSelected = useCallback(
        (document: Document) => selectedDocuments.some((doc) => doc.id === document.id),
        [selectedDocuments],
    );

    const handleToggleSelect = useCallback((document: Document) => {
        setSelectedDocuments((prev) => (prev.some((doc) => doc.id === document.id)
            ? prev.filter((doc) => doc.id !== document.id)
            : [...prev, document]));
    }, []);

    const handleSelectMany = useCallback((documents: Document[], select: boolean) => {
        setSelectedDocuments((prev) => {
            const ids = new Set(documents.map((doc) => doc.id));
            const rest = prev.filter((doc) => !ids.has(doc.id));
            return select ? [...rest, ...documents] : rest;
        });
    }, []);

    const handleSortChange = (newSort: DocumentSortOptions) => {
        setSort(newSort);
        setSelectedDocuments([]);
    };

    const handleFilterChange = (newFilters: DocumentFilters) => {
        setFilters(newFilters);
        setSelectedDocuments([]);
    };

    const handleClearFilters = () => {
        setFilters({});
        setSelectedDocuments([]);
    };

    const handleToggleTagChip = (tagId: number) => {
        const nextTagIds = activeTagIds.includes(tagId)
            ? activeTagIds.filter((id) => id !== tagId)
            : [...activeTagIds, tagId];
        handleFilterChange({
            ...filters,
            tagIds: nextTagIds,
        });
    };

    const handleResetTagChips = () => {
        handleFilterChange({
            ...filters,
            tagIds: [],
            tagNames: [],
        });
    };

    // Only older courses that hold something in this folder count: one with nothing renders
    // no section, and a heading over nothing would promise files that are not there.
    const hasOlder = olderCourses.some((older) => (olderTotals[older.id] ?? 0) > 0);
    const ownIsEmpty = ownTotal === 0;
    const autoOpenOlder = ownTotal !== null && ownTotal < AUTO_OPEN_OLDER_THRESHOLD;

    const toolbarActions = (
        <>
            {selectedDocuments.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-small text-fg-muted">
                        {t('course-page.documents.selected', { amount: selectedDocuments.length })}
                    </span>
                    <DownloadButton documents={selectedDocuments} size={16} showText={true} className="vtk-button-sm" />
                    <button
                        type="button"
                        onClick={() => setSelectedDocuments([])}
                        className="vtk-icon-button"
                        title={t('course-page.documents.clear-selection')}
                        aria-label={t('course-page.documents.clear-selection')}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
            {toolbarEnd && (
                <div className={selectedDocuments.length > 0 ? 'flex items-center' : 'ml-auto flex items-center'}>
                    {toolbarEnd}
                </div>
            )}
        </>
    );

    const tagChips = topTags.length > 0 && (
        <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label={t('course-page.documents.filter-by-tag')}
        >
            {hasActiveTagFilter && (
                <button
                    type="button"
                    onClick={handleResetTagChips}
                    className="inline-flex h-7 items-center rounded-[7px] border border-border-strong bg-surface-muted px-2.5 text-small font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                >
                    {t('course-page.documents.all-tags')}
                </button>
            )}
            {topTags.map((tag) => {
                const active = activeTagIds.includes(tag.id);
                return (
                    <button
                        key={tag.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleToggleTagChip(tag.id)}
                        className={`inline-flex h-7 items-center rounded-[7px] border px-2.5 text-small font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus ${
                            active
                                ? 'border-info-border bg-info-bg text-info-text hover:bg-sky-100'
                                : 'border-border bg-surface text-fg-secondary hover:border-border-strong hover:bg-surface-hover hover:text-fg'
                        }`}
                    >
                        {tag.name}
                    </button>
                );
            })}
        </div>
    );

    return (
        <section aria-label={t('course-page.documents.header')}>
            {courseParts.length > 0 ? (
                <>
                    {/* Row 1: primary part switcher on the left, selection + "open as page" anchored on the right. */}
                    <div className="mb-2.5 flex min-h-8 flex-wrap items-center gap-2">
                        <div
                            className="vtk-tabs max-w-full overflow-x-auto"
                            role="tablist"
                            aria-label={t('course-page.documents.filter-by-part')}
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activePart === null}
                                onClick={() => handlePartChange(null)}
                                className="vtk-tab shrink-0"
                            >
                                {t('course-page.documents.all-parts')}
                            </button>
                            {courseParts.map((part) => (
                                <button
                                    key={part}
                                    type="button"
                                    role="tab"
                                    aria-selected={activePart === part}
                                    onClick={() => handlePartChange(part)}
                                    className="vtk-tab shrink-0"
                                >
                                    {part}
                                </button>
                            ))}
                        </div>
                        {toolbarActions}
                    </div>

                    {/* Row 2: filter, sort, and dynamic tag chips wrap freely without pushing actions down. */}
                    <div className="mb-3 flex min-h-8 flex-wrap items-center gap-2">
                        <DocumentFilter
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={handleClearFilters}
                            course={course}
                            category={category}
                        />
                        <DocumentSort currentSort={sort} onSortChange={handleSortChange} />
                        {tagChips}
                    </div>
                </>
            ) : (
                <>
                    {/* Row 1: filter & sort on the left, selection + "open as page" anchored on the right. */}
                    <div className={`flex min-h-8 flex-wrap items-center gap-2 ${tagChips ? 'mb-2' : 'mb-3'}`}>
                        <DocumentFilter
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={handleClearFilters}
                            course={course}
                            category={category}
                        />
                        <DocumentSort currentSort={sort} onSortChange={handleSortChange} />
                        {toolbarActions}
                    </div>
                    {tagChips && <div className="mb-3">{tagChips}</div>}
                </>
            )}

            <div className="flex flex-col gap-3">
                {hasOlder && (
                    <h3 className="m-0 text-small font-medium text-fg-muted">
                        {t('course-page.documents.this-course')}
                    </h3>
                )}
                {ownCourses.length > 0 && (
                    <DocumentSection
                        courses={ownCourses}
                        category={category}
                        filters={filters}
                        sort={sort}
                        selectedPart={activePart}
                        emptyMessage={hasOlder && ownIsEmpty ? t('course-page.documents.none-see-older') : undefined}
                        isSelected={isSelected}
                        onToggleSelect={handleToggleSelect}
                        onSelectMany={handleSelectMany}
                        onTotal={setOwnTotal}
                        onTags={reportOwnTags}
                        expectedCount={expectedCount}
                    />
                )}

                {hasOlder && (
                    <h3 className="m-0 mt-2 text-small font-medium text-fg-muted">
                        {t('course-page.documents.older-courses')}
                    </h3>
                )}
                {/* Rendered before their heading is known: each section has to load to learn
                    whether it holds anything, and hides itself when it does not. */}
                {olderCourses.map((older) => (
                    <OlderCourseSection
                        key={older.id}
                        older={older}
                        category={category}
                        filters={filters}
                        sort={sort}
                        selectedPart={activePart}
                        openByDefault={autoOpenOlder}
                        isSelected={isSelected}
                        onToggleSelect={handleToggleSelect}
                        onSelectMany={handleSelectMany}
                        onTotal={reportOlderTotal}
                        onTags={reportOlderTags}
                    />
                ))}
            </div>
        </section>
    );
};

interface OlderCourseSectionProps {
    older: Course;
    category?: DocumentCategory;
    filters: DocumentFilters;
    sort: DocumentSortOptions;
    selectedPart?: string | null;
    openByDefault: boolean;
    isSelected: (document: Document) => boolean;
    onToggleSelect: (document: Document) => void;
    onSelectMany: (documents: Document[], select: boolean) => void;
    onTotal: (courseId: number, total: number) => void;
    onTags: (courseId: number, tags: Tag[]) => void;
}

/** One older course: its own memoised course list and total callback, so the section's fetch stays put. */
function OlderCourseSection({ older, onTotal, onTags, ...rest }: OlderCourseSectionProps) {
    const { t } = useTranslation();
    const courses = useMemo(() => [older], [older]);
    const handleTotal = useCallback((total: number) => onTotal(older.id, total), [older.id, onTotal]);
    const handleTags = useCallback((tags: Tag[]) => onTags(older.id, tags), [older.id, onTags]);

    return (
        <DocumentSection
            {...rest}
            courses={courses}
            onTotal={handleTotal}
            onTags={handleTags}
            // The older course's own page holds what this folder cannot show, such as its comments.
            titleHref={`/course/${older.id}`}
            titleLinkLabel={t('course-page.documents.open-course', { code: older.code })}
            title={(
                <>
                    <span className="font-mono text-fg-muted">{older.code}</span>
                    {' '}
                    {courseTitle(older)}
                </>
            )}
        />
    );
}

export default DocumentList;
