import DocumentFilter from '@/components/documentcategorypage/DocumentFilter';
import DocumentSection from '@/components/documentcategorypage/DocumentSection';
import DocumentSort from '@/components/documentcategorypage/DocumentSort';
import DownloadButton from '@/components/ui/DownloadButton';
import { DocumentFilters, DocumentSortOptions } from '@/hooks/useRetrieveDocuments';
import type { Course, Document, DocumentCategory } from '@/types/entities';
import { localizedCourseName } from '@/utils/courseName';
import { X } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DocumentListProps {
    course?: Course;
    category?: DocumentCategory;
    /** Extra controls at the right end of the toolbar, e.g. a link to the folder's own page. */
    toolbarEnd?: React.ReactNode;
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
const DocumentList: React.FC<DocumentListProps> = ({ course, category, toolbarEnd }) => {
    const { t, i18n } = useTranslation();
    const [filters, setFilters] = useState<DocumentFilters>({});
    // Newest academic year first, so a course that has been collecting notes for a
    // decade opens on the material that is still relevant. `year` is stored as
    // "2024 - 2025", which sorts correctly as a string; files without a year come last.
    const [sort, setSort] = useState<DocumentSortOptions>({ field: 'year', direction: 'desc' });
    const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
    const [ownTotal, setOwnTotal] = useState<number | null>(null);
    const [olderTotals, setOlderTotals] = useState<Record<number, number>>({});

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

    // Only older courses that hold something in this folder count: one with nothing renders
    // no section, and a heading over nothing would promise files that are not there.
    const hasOlder = olderCourses.some((older) => (olderTotals[older.id] ?? 0) > 0);
    const ownIsEmpty = ownTotal === 0;

    return (
        <section aria-label={t('course-page.documents.header')}>
            {/* Toolbar: filter and sort on the left, the selection's own actions on the right. */}
            <div className="mb-3 flex min-h-8 flex-wrap items-center gap-2">
                <DocumentFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    course={course}
                    category={category}
                />
                <DocumentSort currentSort={sort} onSortChange={handleSortChange} />

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
            </div>

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
                        emptyMessage={hasOlder ? t('course-page.documents.none-see-older') : undefined}
                        isSelected={isSelected}
                        onToggleSelect={handleToggleSelect}
                        onSelectMany={handleSelectMany}
                        onTotal={setOwnTotal}
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
                        language={i18n.language}
                        openByDefault={ownIsEmpty}
                        isSelected={isSelected}
                        onToggleSelect={handleToggleSelect}
                        onSelectMany={handleSelectMany}
                        onTotal={reportOlderTotal}
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
    language: string;
    openByDefault: boolean;
    isSelected: (document: Document) => boolean;
    onToggleSelect: (document: Document) => void;
    onSelectMany: (documents: Document[], select: boolean) => void;
    onTotal: (courseId: number, total: number) => void;
}

/** One older course: its own memoised course list and total callback, so the section's fetch stays put. */
function OlderCourseSection({ older, onTotal, language, ...rest }: OlderCourseSectionProps) {
    const courses = useMemo(() => [older], [older]);
    const handleTotal = useCallback((total: number) => onTotal(older.id, total), [older.id, onTotal]);

    return (
        <DocumentSection
            {...rest}
            courses={courses}
            onTotal={handleTotal}
            title={(
                <>
                    <span className="font-mono text-fg-muted">{older.code}</span>
                    {' '}
                    {localizedCourseName(older, language)}
                </>
            )}
        />
    );
}

export default DocumentList;
