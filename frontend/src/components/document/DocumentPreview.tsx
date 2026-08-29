'use client';

import { usePublishCurriculumLocation } from "@/components/curriculum/CurriculumLocationContext";
import DocumentCommentSection from "@/components/document/DocumentCommentSection";
import DocumentInfoField from "@/components/document/DocumentInfoField";
import DocumentSiblingNav from "@/components/document/DocumentSiblingNav";
import UnderReviewBox from "@/components/document/UnderReviewBox";
import ErrorPage from "@/components/error/ErrorPage";
import LoadingPage from "@/components/loading/LoadingPage";
import DownloadSingleDocumentButton from "@/components/ui/buttons/DownloadSingleDocumentButton";
import VoteButton from "@/components/ui/buttons/VoteButton";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import PageHead from "@/components/ui/PageHead";
import FavoriteButton from "@/components/ui/FavoriteButton";
import { useUser } from "@/components/UserContext";
import { logDocumentView } from "@/hooks/logDocumentView";
import { readPreloadedApi, useApi } from "@/hooks/useApi";
import type { Document } from "@/types/entities";
import { convertToDocument } from "@/utils/convertToEntity";
import { formatFileSize } from "@/utils/fileSize";
import { inlineUrl, previewKindFor } from "@/utils/previewableFile";
import { Calendar, ChartPie, CircleUser, ExternalLink, File, Package, PenLine } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// Lazy-load PDFViewer so pdfjs-dist never runs on the server (no DOMMatrix in Node)
const PDFViewer = dynamic(() => import("@/components/document/pdf/PDFViewer"), { ssr: false });
const COMMENTS_INLINE_MIN_WIDTH = 1200;

export default function DocumentPreview({ id }: { id: string }) {
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language;
    const endpoint = `/api/documents/${id}?lang=${currentLocale}`;
    const [document, setDocument] = useState<Document | null>(() => {
        const preloaded = readPreloadedApi(endpoint);
        return preloaded ? convertToDocument(preloaded) : null;
    });

    // Used to scale pdf width to fit its parent container
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [showInlineComments, setShowInlineComments] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const previewLayoutRef = useRef<HTMLDivElement>(null);

    const { user } = useUser();
    const { request, loading, error } = useApi();
    const MAXWIDTH = 1000;

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

    // Track the preview panel's own width (not the window's) so the PDF scales
    // to the column it actually sits in.
    useEffect(() => {
        const el = previewRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            setContainerWidth(Math.min(entry.contentRect.width, MAXWIDTH));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [document]);

    // Use the actual page area rather than a viewport breakpoint. A wide curriculum sidebar,
    // browser zoom or OS scaling can make a nominally large laptop just as cramped as a smaller
    // screen. The comments stay inline only when both columns have genuinely useful space.
    useEffect(() => {
        const el = previewLayoutRef.current;
        if (!el) return;

        const observer = new ResizeObserver(([entry]) => {
            setShowInlineComments(entry.contentRect.width >= COMMENTS_INLINE_MIN_WIDTH);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [document?.id]);

    if (loading) return <LoadingPage />;

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

    return (
        <div className="vtk-shell pb-16">
            {/* Editorial page head: breadcrumb kicker, document name as the display
                title, and the file facts as a right-aligned spec block. */}
            <PageHead
                kicker={
                    <DynamicBreadcrumb />
                }
                title={document.name}
                icon={File}
            >
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                    {document.createdAt && <DocumentInfoField icon={Calendar} value={document.createdAt?.toLocaleDateString()} />}
                    {document.fileSize && <DocumentInfoField icon={Package} value={formatFileSize(document.fileSize)} />}
                    {document.year && <DocumentInfoField icon={ChartPie} value={document.year} />}
                    {/* Only the Seafile import fills `author` in, so this shows up on
                        migrated archive files, where the uploader is the archive account
                        rather than the person who actually wrote the notes. */}
                    {document.author && !document.anonymous && (
                        <DocumentInfoField
                            icon={PenLine}
                            value={`${t("document.author")}: ${document.author}`}
                        />
                    )}
                    <DocumentInfoField
                        icon={CircleUser}
                        value={document.anonymous
                            ? t("document.anonymous")
                            : `${t("document.uploaded-by")}: ${document.creator?.fullName || ""}`}
                    />
                </div>
            </PageHead>

            {/* Under review box */}
            {document.underReview && (
                <div className="mt-6">
                    <UnderReviewBox />
                </div>
            )}

            {/* Document preview & comment section */}
            <div
                ref={previewLayoutRef}
                className={`mt-7 grid items-start gap-4 ${showInlineComments
                    ? 'grid-cols-[minmax(0,1fr)_360px]'
                    : 'grid-cols-1'
                    }`}
            >
                <div className="vtk-panel overflow-hidden">
                    <div className="flex items-center justify-between gap-3 border-b border-vtk-line px-4 py-3">
                        <VoteButton
                            type="document"
                            objectId={Number(id)}
                            disabled={!user}
                        />
                        <DocumentSiblingNav document={document} />
                        <div className="flex items-center gap-2">
                            <DownloadSingleDocumentButton
                                document={document}
                                fileSize={document.fileSize ? formatFileSize(document.fileSize) : undefined}
                                disabled={!user}
                            />
                            {inlineHref && (
                                <a
                                    href={inlineHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="vtk-btn vtk-btn-ghost p-2"
                                    title={t('document.open-in-browser')}
                                >
                                    <ExternalLink className="h-[18px] w-[18px]" />
                                </a>
                            )}
                            <FavoriteButton
                                itemId={Number(id)}
                                itemType="document"
                                size={18}
                            />
                        </div>
                    </div>

                    <div ref={previewRef} className="flex justify-center overflow-x-auto bg-vtk-paper-2 p-4">
                        {document.contentUrl && isPdf ? (
                            <PDFViewer file={document.contentUrl} width={containerWidth} />
                        ) : document.contentUrl && isImage ? (
                            // Not next/image: contentUrl points at the backend's download
                            // route, which would need a remotePatterns entry per deployment
                            // and gains nothing here — the file is authenticated, one-off,
                            // and never a candidate for the optimizer's cache.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={inlineUrl(document.contentUrl)}
                                alt={document.name}
                                className="max-h-[75vh] max-w-full rounded shadow-sm object-contain"
                            />
                        ) : (
                            <div className="vtk-empty flex h-96 w-full items-center justify-center">
                                {t('document.no-preview', { filename: document.filename })}
                            </div>
                        )}
                    </div>
                </div>

                <DocumentCommentSection
                    key={document.id}
                    documentId={document.id}
                    file={document.contentUrl}
                    displayInline={showInlineComments}
                />
            </div>
        </div>
    )
}
