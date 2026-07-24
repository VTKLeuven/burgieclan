import Badge from '@/components/ui/Badge';
import VoteButton from '@/components/ui/buttons/VoteButton';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import Pagination from '@/components/ui/Pagination';
import useRetrieveDocuments from '@/hooks/useRetrieveDocuments';
import type { Document } from '@/types/entities';
import { ChevronDown, ChevronUp, ExternalLink, LoaderCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const PDFViewer = dynamic(() => import('@/components/document/pdf/PDFViewer'), { ssr: false });

function AccountDocumentCard({ document }: { document: Document }) {
    const { t } = useTranslation();
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

    return (
        <div ref={containerRef} className="border border-vtk-line p-4 rounded-md shadow-xs bg-vtk-paper hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start gap-2">
                <Link href={`/document/${document.id}`} className="hover:underline flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate text-vtk-ink">{document.name}</h3>
                </Link>
                <div className="shrink-0 flex items-center gap-2">
                    {document.underReview ? (
                        <Badge text={t('document.under_review')} color="yellow" />
                    ) : (
                        <Badge text={t('document.approved')} color="green" />
                    )}
                </div>
            </div>

            <div className="mt-1 text-sm text-vtk-body">
                {document.course?.name && <p className="truncate font-medium">{document.course.name}</p>}
                {document.category?.name && <p className="text-xs text-vtk-muted truncate">{document.category.name}</p>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-vtk-line">
                <VoteButton type="document" objectId={document.id} size="small" />

                <div className="flex items-center gap-2.5 ml-auto">
                    {document.createdAt && (
                        <span className="text-vtk-muted text-xs tabular-nums">
                            {new Date(document.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            })}
                        </span>
                    )}

                    {isPdf && document.contentUrl && (
                        <button
                            type="button"
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-vtk-paper-2 hover:bg-vtk-line text-vtk-ink transition-colors font-medium cursor-pointer"
                            title={t('document.preview', { defaultValue: 'Preview' })}
                        >
                            <span>{t('document.preview', { defaultValue: 'Preview' })}</span>
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}

                    <Link
                        href={`/document/${document.id}`}
                        className="p-1 text-vtk-muted hover:text-vtk-ink transition-colors"
                        title={t('document.open', { defaultValue: 'Open Document' })}
                    >
                        <ExternalLink size={15} />
                    </Link>
                </div>
            </div>

            {expanded && isPdf && document.contentUrl && (
                <div className="mt-3 pt-3 border-t border-vtk-line flex justify-center bg-vtk-paper-2 p-2 rounded-md">
                    <PDFViewer file={document.contentUrl} width={Math.min(containerWidth - 32, 800)} />
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

    return (
        <CollapsibleSection header={<h3 className="text-xl font-semibold">{t('account.documents.my')} <span className="text-sm">({totalItems})</span></h3>}>
            <div className="rounded-lg shadow-xs">
                {loading ?
                    <div className="flex justify-center items-center h-full py-8">
                        <LoaderCircle className="animate-spin text-vtk-navy" size={48} />
                    </div>
                    : documents.length === 0 ? (
                        <p className='p-4'>{t('account.documents.no_uploads')}</p>
                    ) : (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                {documents.map((doc) => (
                                    <AccountDocumentCard key={doc.id} document={doc} />
                                ))}
                            </div>
                            <Pagination totalAmount={totalItems} currentPage={page} itemsPerPage={itemsPerPage} onPageChange={setPage} />
                        </div>
                    )}
            </div>
        </CollapsibleSection>
    );
};

export default DocumentList;