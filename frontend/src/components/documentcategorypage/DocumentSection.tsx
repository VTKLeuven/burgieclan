import DocumentListItem from '@/components/documentcategorypage/DocumentListItem';
import { Checkbox } from '@/components/ui/Checkbox';
import Pagination from '@/components/ui/Pagination';
import useRetrieveDocuments, { DocumentFilters, DocumentSortOptions } from '@/hooks/useRetrieveDocuments';
import type { Course, Document, DocumentCategory, Tag } from '@/types/entities';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { ArrowUpRight, ChevronRight, LoaderCircle } from 'lucide-react';
import React, { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ITEMS_PER_PAGE = 50;

interface DocumentSectionProps {
    /** The courses whose documents this section lists, the first being the one it is about. */
    courses: Course[];
    category?: DocumentCategory;
    filters: DocumentFilters;
    sort: DocumentSortOptions;
    selectedPart?: string | null;
    /** Heading of a collapsible section; a section without one is always open. */
    title?: React.ReactNode;
    /** Opens a collapsed section, e.g. when the course itself has nothing in this category. */
    openByDefault?: boolean;
    /** A page the section's heading belongs to, e.g. the older course's own page with its comments. */
    titleHref?: string;
    titleLinkLabel?: string;
    emptyMessage?: string;
    isSelected: (document: Document) => boolean;
    onToggleSelect: (document: Document) => void;
    onSelectMany: (documents: Document[], select: boolean) => void;
    onTotal?: (total: number) => void;
    onTags?: (tags: Tag[]) => void;
}

/**
 * One file shown once. A migrated Seafile file can sit on two identical courses at the same
 * time; keep the copy on the course the section is about, otherwise the first one listed.
 */
function dedupeBySeafileFile(documents: Document[], preferredCourseId: number): Document[] {
    const kept = new Map<string, Document>();
    const result: Document[] = [];
    for (const document of documents) {
        const key = document.seafileFileId;
        if (!key) {
            result.push(document);
            continue;
        }
        const existing = kept.get(key);
        if (!existing) {
            kept.set(key, document);
            result.push(document);
        } else if (document.course?.id === preferredCourseId && existing.course?.id !== preferredCourseId) {
            result[result.indexOf(existing)] = document;
            kept.set(key, document);
        }
    }
    return result;
}

/** Consecutive runs of the same academic year, in the order the server sorted them. */
function groupByYear(documents: Document[]): { year: string | null; documents: Document[] }[] {
    const groups: { year: string | null; documents: Document[] }[] = [];
    for (const document of documents) {
        const year = document.year?.trim() || null;
        const last = groups[groups.length - 1];
        if (last && last.year === year) {
            last.documents.push(document);
        } else {
            groups.push({ year, documents: [document] });
        }
    }
    return groups;
}

const DocumentSection: React.FC<DocumentSectionProps> = ({
    courses,
    category,
    filters,
    sort,
    selectedPart = null,
    title,
    openByDefault = false,
    titleHref,
    titleLinkLabel,
    emptyMessage,
    isSelected,
    onToggleSelect,
    onSelectMany,
    onTotal,
    onTags,
}) => {
    const { t } = useTranslation();
    const contentId = useId();
    const collapsible = title !== undefined;
    // null until the reader clicks the header: until then the section follows openByDefault,
    // which the list only learns once the course's own documents have loaded.
    const [userOpen, setUserOpen] = useState<boolean | null>(null);
    const open = !collapsible || (userOpen ?? openByDefault);

    // The page belongs to one filter and order: another one makes page 3 of the old result
    // meaningless, so a page chosen for a different query reads as page 1.
    const queryKey = JSON.stringify([filters, sort]);
    const [pageState, setPageState] = useState({ queryKey, page: 1 });
    const page = pageState.queryKey === queryKey ? pageState.page : 1;
    const setPage = (next: number) => setPageState({ queryKey, page: next });

    const { documents, loading, totalItems } = useRetrieveDocuments(
        page,
        ITEMS_PER_PAGE,
        courses,
        category,
        false,
        filters,
        sort,
        false,
    );

    useEffect(() => {
        if (!loading) {
            onTotal?.(totalItems);
        }
    }, [loading, totalItems, onTotal]);

    const deduped = useMemo(
        () => (courses.length > 1 ? dedupeBySeafileFile(documents, courses[0].id) : documents),
        [documents, courses],
    );
    const shown = useMemo(
        () => (selectedPart !== null ? deduped.filter((doc) => doc.parts?.includes(selectedPart)) : deduped),
        [deduped, selectedPart],
    );

    useEffect(() => {
        if (!loading && onTags) {
            const tags: Tag[] = [];
            for (const doc of shown) {
                for (const tag of doc.tags ?? []) {
                    if (!tag.hidden && tag.name) {
                        tags.push(tag);
                    }
                }
            }
            onTags(tags);
        }
    }, [loading, shown, onTags]);
    // The server counts every row; the copies hidden above are not files the reader will see.
    // Exact while everything fits on one page, which is the common case for a single folder.
    const shownTotal = selectedPart !== null
        ? shown.length
        : totalItems - (documents.length - deduped.length);
    const courseParts = courses[0]?.parts;
    const groups = useMemo(
        () => (sort.field === 'year' ? groupByYear(shown) : [{ year: null, documents: shown }]),
        [shown, sort.field],
    );
    const showYearHeaders = sort.field === 'year';
    const allSelected = shown.length > 0 && shown.every(isSelected);

    // A collapsed section with nothing in it is noise; a section without a title is the
    // course's own list and stays, so its empty message can point at the ones below.
    if (collapsible && !loading && totalItems === 0) {
        return null;
    }

    const body = loading ? (
        <div className="flex items-center justify-center py-14">
            <LoaderCircle className="animate-spin text-icon" size={20} />
        </div>
    ) : shown.length === 0 ? (
        <p className="vtk-empty m-0">{emptyMessage ?? t('course-page.documents.no-documents')}</p>
    ) : (
        <>
            <div className="flex h-10 items-center gap-3 border-b border-border bg-surface-muted px-4">
                <Checkbox
                    label={allSelected ? t('course-page.documents.deselect-all') : t('course-page.documents.select-all')}
                    checked={allSelected}
                    onChange={() => onSelectMany(shown, !allSelected)}
                    className="my-0"
                    labelClassName="text-small font-medium text-fg-muted"
                />
                <span className="ml-auto text-small text-fg-muted tabular">
                    {shownTotal === 1
                        ? t('course-page.document-count.one')
                        : t('course-page.document-count.other', { count: shownTotal })}
                </span>
            </div>

            {groups.map((group, index) => (
                <div key={`${group.year ?? 'none'}-${index}`}>
                    {showYearHeaders && (
                        <h4 className="m-0 border-b border-border bg-surface px-4 py-1.5 text-small font-medium text-fg-muted tabular">
                            {group.year ?? t('course-page.documents.no-year')}
                        </h4>
                    )}
                    <div className="vtk-rows">
                        {group.documents.map((document) => (
                            <DocumentListItem
                                key={document.id}
                                document={document}
                                isSelected={isSelected(document)}
                                onToggleSelect={onToggleSelect}
                                courseBadge={courses.length > 1 && document.course?.id !== courses[0].id
                                    ? document.course?.code
                                    : undefined}
                                courseParts={courseParts}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {totalItems > ITEMS_PER_PAGE && (
                <div className="border-t border-border px-4 py-3">
                    <Pagination totalAmount={totalItems} currentPage={page} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setPage} />
                </div>
            )}
        </>
    );

    if (!collapsible) {
        return <div className="vtk-panel overflow-hidden">{body}</div>;
    }

    return (
        <section className="vtk-panel overflow-hidden">
            {/* The toggle and the link sit side by side: a link inside a button is not valid HTML. */}
            <div className="flex items-center">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={contentId}
                onClick={() => setUserOpen(!open)}
                className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 px-4 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
                <ChevronRight
                    className={`size-4 shrink-0 text-fg-placeholder transition-transform duration-150 group-hover:text-icon ${open ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{title}</span>
                {!loading && (
                    <span className="shrink-0 text-small text-fg-muted tabular">
                        {totalItems === 1
                            ? t('course-page.document-count.one')
                            : t('course-page.document-count.other', { count: totalItems })}
                    </span>
                )}
            </button>
            {titleHref && (
                <ApiPrefetchLink
                    href={titleHref}
                    className="inline-flex h-10 shrink-0 items-center gap-1 px-3 text-small font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                    aria-label={titleLinkLabel}
                    title={titleLinkLabel}
                >
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </ApiPrefetchLink>
            )}
            </div>
            {open && (
                <div id={contentId} className="border-t border-border">
                    {body}
                </div>
            )}
        </section>
    );
};

export default DocumentSection;
