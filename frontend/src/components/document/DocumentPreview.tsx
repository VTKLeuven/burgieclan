'use client';

import { usePublishCurriculumLocation } from "@/components/curriculum/CurriculumLocationContext";
import DeleteDocumentButton from "@/components/document/DeleteDocumentButton";
import DocumentCommentSection from "@/components/document/DocumentCommentSection";
import DocumentFolderList from "@/components/document/DocumentFolderList";
import DocumentSiblingNav from "@/components/document/DocumentSiblingNav";
import PageHeader from "@/components/layout/PageHeader";
import UnderReviewBox from "@/components/document/UnderReviewBox";
import ErrorPage from "@/components/error/ErrorPage";
import LoadingPage from "@/components/loading/LoadingPage";
import DownloadSingleDocumentButton from "@/components/ui/buttons/DownloadSingleDocumentButton";
import VoteButton from "@/components/ui/buttons/VoteButton";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import FavoriteButton from "@/components/ui/FavoriteButton";
import { useUser } from "@/components/UserContext";
import { logDocumentView } from "@/hooks/logDocumentView";
import { useSiblingDocuments } from "@/hooks/useSiblingDocuments";
import { readPreloadedApi, useApi } from "@/hooks/useApi";
import type { Document } from "@/types/entities";
import { convertToDocument } from "@/utils/convertToEntity";
import { formatFileSize } from "@/utils/fileSize";
import { inlineUrl, previewKindFor } from "@/utils/previewableFile";
import { ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { localizedCourseName } from "@/utils/courseName";

// Lazy-load PDFViewer so pdfjs-dist never runs on the server (no DOMMatrix in Node)
const PDFViewer = dynamic(() => import("@/components/document/pdf/PDFViewer"), { ssr: false });
/** Below this panel width the sidebar (details, folder, comments) moves under the preview. */
const SIDEBAR_MIN_WIDTH = 1080;

function Property({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-3 py-1.5">
            <dt className="pt-0.5 text-small text-fg-muted">{label}</dt>
            <dd className="m-0 min-w-0 text-body text-fg [overflow-wrap:anywhere]">{children}</dd>
        </div>
    );
}

export default function DocumentPreview({ id }: { id: string }) {
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language;
    const endpoint = `/api/documents/${id}?lang=${currentLocale}`;
    const [document, setDocument] = useState<Document | null>(() => {
        const preloaded = readPreloadedApi(endpoint);
        return preloaded ? convertToDocument(preloaded) : null;
    });

    const [showInlineComments, setShowInlineComments] = useState(false);
    const previewLayoutRef = useRef<HTMLDivElement>(null);

    const { user } = useUser();
    const { documents: siblings, loading: siblingsLoading } = useSiblingDocuments(
        document?.course?.id,
        document?.category?.id,
    );
    const { request, loading, error } = useApi();
    const router = useRouter();

    useEffect(() => {
        if (document?.id === Number(id)) return;

        const fetchDocumentData = async () => {
            const documentData = await request('GET', endpoint);
            if (!documentData) {
                return null;
            }
            setDocument(convertToDocument(documentData));
        };

        fetchDocumentData();
    }, [document?.id, endpoint, id, request]);

    useEffect(() => {
        logDocumentView(id);
    }, [id]);

    // Feeds the folder tree and the breadcrumb in the layout, which cannot read this route.
    usePublishCurriculumLocation({
        course: document?.course,
        category: document?.category,
        document: document ?? undefined,
    });

    // Set window title based on document name
    useEffect(() => {
        if (document?.name) {
            window.document.title = `${document.name} | Burgieclan`;
        }
    }, [document?.name]);

    // Use the actual page area rather than a viewport breakpoint. A wide curriculum sidebar,
    // browser zoom or OS scaling can make a nominally large laptop just as cramped as a smaller
    // screen. The comments stay inline only when both columns have genuinely useful space.
    useEffect(() => {
        const el = previewLayoutRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            setShowInlineComments(entry.contentRect.width >= SIDEBAR_MIN_WIDTH);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [document?.id]);

    const header = (actions?: ReactNode) => <PageHeader breadcrumb={<DynamicBreadcrumb />} actions={actions} />;

    if (loading) return <>{header()}<LoadingPage /></>;

    if (error) {
        return <ErrorPage status={error.status} detail={error.message} />;
    }

    if (!document) return null;

    // Which types render in-browser lives in one place now, shared with the document rows
    // and kept in step with the backend list that decides what ?inline=1 actually serves.
    const previewKind = previewKindFor(document.filename ?? document.contentUrl, document.mimetype);
    const isPdf = previewKind === 'pdf';
    const isImage = previewKind === 'image';
    // Null when the file is not one the browser can draw, which is also the only case where
    // the "open in a new tab" control has nothing to point at.
    const inlineHref = document.contentUrl && previewKind ? inlineUrl(document.contentUrl) : null;
    const locale = currentLocale === 'nl' ? 'nl-BE' : 'en-GB';

    const comments = (
        <DocumentCommentSection
            key={document.id}
            documentId={document.id}
            file={document.contentUrl}
            displayInline={showInlineComments}
        />
    );

    const details = (
        <dl className="m-0">
            {document.year && <Property label={t('document.year')}>{document.year}</Property>}
            {/* Only the Seafile import fills `author` in, so this shows up on migrated archive
                files, where the uploader is the archive account rather than the person who
                actually wrote the notes. */}
            {document.author && !document.anonymous && (
                <Property label={t('document.author')}>{document.author}</Property>
            )}
            <Property label={t('document.uploaded-by')}>
                {document.anonymous ? t('document.anonymous') : (document.creator?.fullName || '')}
            </Property>
            {document.createdAt && (
                <Property label={t('document.date')}>
                    <span className="tabular">
                        {document.createdAt.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </Property>
            )}
            {document.fileSize && (
                <Property label={t('document.size')}>
                    <span className="tabular">{formatFileSize(document.fileSize)}</span>
                </Property>
            )}
            <Property label={t('document.votes')}>
                <VoteButton type="document" objectId={Number(id)} disabled={!user} size="small" />
            </Property>
        </dl>
    );

    return (
        <>
            {header(
                <>
                    <DocumentSiblingNav document={document} />
                    {!showInlineComments && comments}
                    <FavoriteButton itemId={Number(id)} itemType="document" size={18} className="vtk-icon-button" />
                    {inlineHref && (
                        <a
                            href={inlineHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vtk-icon-button max-sm:hidden"
                            title={t('document.open-in-browser')}
                            aria-label={t('document.open-in-browser')}
                        >
                            <ExternalLink className="size-[18px]" />
                        </a>
                    )}
                    <DownloadSingleDocumentButton
                        document={document}
                        fileSize={document.fileSize ? formatFileSize(document.fileSize) : undefined}
                        disabled={!user}
                    />
                </>
            )}

            <div ref={previewLayoutRef} className={`flex flex-1 ${showInlineComments ? 'flex-row' : 'flex-col'}`}>
                <div className="min-w-0 flex-1 px-4 pt-7 pb-16 md:px-8">
                    <h1 className="vtk-page-title">{document.name}</h1>
                    <p className="m-0 mt-1 flex flex-wrap gap-x-2 text-body text-fg-muted">
                        {document.course && (
                            <span>{localizedCourseName(document.course, currentLocale)}</span>
                        )}
                        {document.category?.name && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span>{document.category.name}</span>
                            </>
                        )}
                        {document.year && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="tabular">{document.year}</span>
                            </>
                        )}
                    </p>

                    {document.underReview && (
                        <div className="mt-5">
                            <UnderReviewBox
                                action={document.canDelete ? (
                                    <DeleteDocumentButton
                                        documentId={document.id}
                                        documentName={document.name}
                                        // The document is gone, so there is nothing left to show here.
                                        // Its category folder is the nearest page that still exists.
                                        onDeleted={() => router.push(
                                            document.course && document.category
                                                ? `/course/${document.course.id}/documents/category/${document.category.id}`
                                                : '/account'
                                        )}
                                    />
                                ) : undefined}
                            />
                        </div>
                    )}

                    {/* The PDF viewer brings its own zoom bar and scroll area — it has to measure
                        and scroll the column itself — so it sits outside the padded box the other
                        preview kinds share. */}
                    <div className="mt-6 overflow-hidden rounded-card border border-border bg-surface-muted">
                        {document.contentUrl && isPdf ? (
                            <PDFViewer documentId={document.id} />
                        ) : (
                            <div className="flex justify-center overflow-x-auto p-4">
                                {document.contentUrl && isImage ? (
                                    // Not next/image: contentUrl points at the backend's download
                                    // route, which would need a remotePatterns entry per deployment
                                    // and gains nothing here — the file is authenticated, one-off,
                                    // and never a candidate for the optimizer's cache.
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={inlineUrl(document.contentUrl)}
                                        alt={document.name}
                                        className="max-h-[75vh] max-w-full rounded-[6px] object-contain"
                                    />
                                ) : (
                                    <div className="vtk-empty flex h-80 w-full items-center justify-center">
                                        {t('document.no-preview', { filename: document.filename })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!showInlineComments && (
                        <div className="mt-10 grid gap-8 md:grid-cols-2">
                            <section>
                                <h2 className="m-0 mb-2 text-body font-semibold">{t('document.details')}</h2>
                                {details}
                            </section>
                            {document.course && document.category && (
                                <DocumentFolderList
                                    course={document.course}
                                    category={document.category}
                                    currentDocument={document}
                                    documents={siblings}
                                    loading={siblingsLoading}
                                />
                            )}
                        </div>
                    )}
                </div>

                {showInlineComments && (
                    <aside className="w-[340px] shrink-0 border-l border-border px-6 py-6">
                        <div className="grid gap-8">
                            {details}
                            {document.course && document.category && (
                                <DocumentFolderList
                                    course={document.course}
                                    category={document.category}
                                    currentDocument={document}
                                    documents={siblings}
                                    loading={siblingsLoading}
                                />
                            )}
                            {comments}
                        </div>
                    </aside>
                )}
            </div>
        </>
    )
}
