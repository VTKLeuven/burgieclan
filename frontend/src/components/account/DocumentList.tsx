import Badge from '@/components/ui/Badge';
import DeleteDocumentButton from '@/components/document/DeleteDocumentButton';
import VoteButton from '@/components/ui/buttons/VoteButton';
import Loading from '@/components/loading/LoadingPage';
import CreateDocumentButton from '@/components/ui/CreateDocumentButton';
import Pagination from '@/components/ui/Pagination';
import useRetrieveDocuments from '@/hooks/useRetrieveDocuments';
import type { Document } from '@/types/entities';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedCourseName } from '@/utils/courseName';

const PDFPages = dynamic(() => import('@/components/document/pdf/PDFPages'), { ssr: false });

function AccountDocumentCard({ document, onDeleted }: { document: Document; onDeleted: (documentId: number) => void }) {
    const { t, i18n } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const [containerWidth, setContainerWidth] = useState(600);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            setContainerWidth(entry.contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const isPdf = document.mimetype === "application/pdf" ||
        document.filename?.toLowerCase().endsWith('.pdf') ||
        document.contentUrl?.toLowerCase().endsWith('.pdf');

    // Guarded on below rather than `course.name`: a course can carry nameNl/nameEn without the
    // fallback `name` being set, and guarding on `name` would hide a title we can render.
    const courseName = localizedCourseName(document.course, i18n.language);

    const docEndpoints = [
        `/api/documents/${document.id}?lang=${i18n.language}`,
        `/api/document_comments?document=/api/documents/${document.id}`,
    ];

    const created = document.createdAt
        ? new Date(document.createdAt).toLocaleDateString(i18n.language === 'nl' ? 'nl-BE' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : null;

    return (
        <div ref={containerRef} className="group/row">
            <div className="flex min-h-[52px] items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-hover">
                <FileText className="size-4 shrink-0 text-icon" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                        <ApiPrefetchLink
                            href={`/document/${document.id}`}
                            apiEndpoints={docEndpoints}
                            className="min-w-0 truncate text-body font-medium text-fg hover:underline"
                        >
                            {document.name}
                        </ApiPrefetchLink>
                        {document.underReview && <Badge text={t('document.under_review')} color="yellow" />}
                    </span>
                    {(courseName || document.category?.name) && (
                        <p className="m-0 truncate text-caption text-fg-muted">
                            {[courseName, document.category?.name].filter(Boolean).join(' · ')}
                        </p>
                    )}
                </div>
                {created && (
                    <span className="hidden w-24 shrink-0 text-right text-small text-fg-muted tabular sm:block">{created}</span>
                )}
                <VoteButton type="document" objectId={document.id} size="small" />
                <span className="flex shrink-0 items-center gap-0.5">
                    {isPdf && document.contentUrl && (
                        <button
                            type="button"
                            onClick={() => setExpanded(!expanded)}
                            className="vtk-icon-button reveal-on-hover"
                            aria-expanded={expanded}
                            title={t('document.preview', { defaultValue: 'Preview' })}
                            aria-label={t('document.preview', { defaultValue: 'Preview' })}
                        >
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    )}
                    {document.canDelete && (
                        <span className="reveal-on-hover">
                            <DeleteDocumentButton
                                documentId={document.id}
                                documentName={document.name}
                                variant="icon"
                                onDeleted={() => onDeleted(document.id)}
                            />
                        </span>
                    )}
                </span>
            </div>

            {expanded && isPdf && document.contentUrl && (
                <div className="flex justify-center border-t border-border bg-surface-muted p-3">
                    <PDFPages documentId={document.id} width={Math.min(containerWidth - 32, 800)} />
                </div>
            )}
        </div>
    );
}

const DocumentList: React.FC = () => {
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const { documents, loading, totalItems } = useRetrieveDocuments(page, itemsPerPage);
    const { t } = useTranslation();
    // Deleted ids rather than a copy of the list: the fetch hook owns `documents` and replaces
    // it on every page change, so a local copy would resurrect what was just removed.
    //
    // Tied to the array they were removed from, because a fresh fetch already leaves those rows
    // out and carries a corrected total - carrying the ids over would subtract them twice.
    const [deleted, setDeleted] = useState<{ from: Document[]; ids: number[] }>({ from: documents, ids: [] });
    const deletedIds = deleted.from === documents ? deleted.ids : [];

    const visibleDocuments = documents.filter((doc) => !deletedIds.includes(doc.id));

    const handleDeleted = (documentId: number) => {
        setDeleted((previous) => ({
            from: documents,
            ids: previous.from === documents ? [...previous.ids, documentId] : [documentId],
        }));
    };

    useEffect(() => {
        const updateItemsPerPage = () => {
            if (window.innerWidth < 768) {
                setItemsPerPage(10);
            } else {
                setItemsPerPage(20);
            }
        };

        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);

        return () => {
            window.removeEventListener('resize', updateItemsPerPage);
        };
    }, []);

    const total = Math.max(totalItems - deletedIds.length, 0);

    if (loading) {
        return <Loading compact />;
    }

    if (visibleDocuments.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-4 py-10 text-center">
                <p className="m-0 text-body text-fg-muted">{t('account.documents.no_uploads')}</p>
                <CreateDocumentButton size={16} className="vtk-button-sm" />
            </div>
        );
    }

    return (
        <div className="vtk-panel overflow-hidden">
            <div className="vtk-rows">
                {visibleDocuments.map((doc) => (
                    <AccountDocumentCard key={doc.id} document={doc} onDeleted={handleDeleted} />
                ))}
            </div>
            {total > itemsPerPage && (
                <div className="border-t border-border px-4 py-3">
                    <Pagination totalAmount={total} currentPage={page} itemsPerPage={itemsPerPage} onPageChange={setPage} />
                </div>
            )}
        </div>
    );
};

export default DocumentList;
