'use client';

import SectionHeader from '@/components/ui/SectionHeader';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import type { Course, Document, DocumentCategory } from '@/types/entities';
import { FileText, FolderOpen, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** How many neighbours to show around the open document before the list points to the folder. */
const WINDOW = 8;

interface DocumentFolderListProps {
    course: Course;
    category: DocumentCategory;
    currentDocument?: Document;
    documents: Document[];
    loading: boolean;
}

/**
 * "In deze map" on a document page: the other files in the same folder, in the folder's own
 * order, so reading the next exercise session is one click instead of a trip back to the list.
 */
export default function DocumentFolderList({
    course,
    category,
    currentDocument,
    documents,
    loading,
}: DocumentFolderListProps) {
    const { t, i18n } = useTranslation();
    const folderHref = `/course/${course.id}/documents/category/${category.id}`;

    const index = Math.max(0, documents.findIndex((doc) => doc.id === currentDocument?.id));
    const start = Math.max(0, Math.min(index - Math.floor(WINDOW / 2), documents.length - WINDOW));
    const shown = documents.slice(start, start + WINDOW);

    return (
        <section aria-labelledby="folder-heading">
            <SectionHeader
                id="folder-heading"
                icon={<FolderOpen />}
                title={t('sidebar.in_this_folder')}
                count={documents.length || undefined}
                action={
                    <ApiPrefetchLink
                        href={folderHref}
                        apiEndpoints={[
                            `/api/courses/${course.id}?summary=true`,
                            `/api/document_categories/${category.id}?lang=${i18n.language}`,
                        ]}
                        className="max-w-36 truncate text-small font-medium text-fg-muted hover:text-fg"
                        title={category.name ?? ''}
                    >
                        {category.name}
                    </ApiPrefetchLink>
                }
            />

            {loading && documents.length === 0 ? (
                <div className="flex justify-center py-4">
                    <LoaderCircle className="animate-spin text-icon" size={16} />
                </div>
            ) : documents.length === 0 ? (
                <p className="m-0 text-small text-fg-muted">{t('sidebar.no_documents_in_folder')}</p>
            ) : (
                <div className="-mx-2 flex flex-col gap-0.5">
                    {shown.map((doc) => {
                        const isActive = currentDocument?.id === doc.id;
                        const displayName = doc.name ?? doc.filename ?? '';

                        return (
                            <ApiPrefetchLink
                                key={doc.id}
                                href={`/document/${doc.id}`}
                                apiEndpoints={[
                                    `/api/documents/${doc.id}?lang=${i18n.language}`,
                                    `/api/document_comments?document=/api/documents/${doc.id}`,
                                ]}
                                title={displayName}
                                aria-current={isActive ? 'page' : undefined}
                                className={`flex h-8 items-center gap-2 rounded-control px-2 text-small transition-colors ${isActive
                                    ? 'bg-sidebar-active font-medium text-fg'
                                    : 'text-fg-secondary hover:bg-neutral-150 hover:text-fg'
                                    }`}
                            >
                                <FileText className="size-4 shrink-0 text-icon" aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate">{displayName}</span>
                                {doc.year && (
                                    <span className="shrink-0 text-caption text-fg-muted tabular">{doc.year}</span>
                                )}
                            </ApiPrefetchLink>
                        );
                    })}
                    {documents.length > shown.length && (
                        <ApiPrefetchLink
                            href={folderHref}
                            className="flex h-8 items-center rounded-control px-2 text-small text-fg-muted hover:bg-neutral-150 hover:text-fg"
                        >
                            {t('shell.show_all', { count: documents.length })}
                        </ApiPrefetchLink>
                    )}
                </div>
            )}
        </section>
    );
}
