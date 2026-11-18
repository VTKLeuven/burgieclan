'use client'

import DocumentList from '@/components/documentcategorypage/DocumentList';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { cn } from '@/lib/utils';
import type { Course, DocumentCategory as DocumentCategoryEntity } from '@/types/entities';
import { ArrowUpRight, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useId } from 'react';
import { useTranslation } from "react-i18next";

interface DocumentCategoryProps {
    category: DocumentCategoryEntity;
    course: Course;
    count?: number;
    open: boolean;
    onToggle: () => void;
}

/**
 * One folder of a course as a disclosure row: opening it lists the folder's documents right here,
 * with the same filter, sort and selection as the folder's own page, which stays one click away
 * for a link to share or a view with more room.
 */
export default function DocumentCategory({ category, course, count = 0, open, onToggle }: DocumentCategoryProps) {
    const { t, i18n } = useTranslation();
    const regionId = useId();
    const href = `/course/${course.id}/documents/category/${category.id}`;

    const countLabel = count === 0
        ? t('course-page.document-count.zero')
        : count === 1
            ? t('course-page.document-count.one')
            : t('course-page.document-count.other', { count });

    const FolderIcon = open ? FolderOpen : Folder;

    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                aria-controls={regionId}
                className="vtk-list-row group w-full text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
                <ChevronRight
                    className={cn('size-4 shrink-0 text-fg-placeholder transition-transform duration-150 group-hover:text-icon', open && 'rotate-90')}
                    aria-hidden="true"
                />
                <FolderIcon className="size-4 shrink-0 text-icon" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{category.name}</span>
                <span className={`shrink-0 text-small tabular ${count === 0 ? 'text-fg-placeholder' : 'text-fg-muted'}`}>
                    {countLabel}
                </span>
            </button>

            {open && (
                <div id={regionId} role="region" aria-label={category.name} className="border-t border-border bg-surface-muted p-3 sm:p-4">
                    <DocumentList
                        course={course}
                        category={category}
                        toolbarEnd={
                            <ApiPrefetchLink
                                href={href}
                                apiEndpoints={[
                                    `/api/courses/${course.id}?summary=true`,
                                    `/api/document_categories/${category.id}?lang=${i18n.language}`,
                                ]}
                                className="inline-flex h-8 items-center gap-1 rounded-control px-2 text-small font-medium text-fg-muted transition-colors hover:bg-neutral-150 hover:text-fg"
                            >
                                {t('course-page.open-category')}
                                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                            </ApiPrefetchLink>
                        }
                    />
                </div>
            )}
        </div>
    );
}
