'use client';

import DocumentCommentSection from "@/components/document/DocumentCommentSection";
import DocumentInfoField from "@/components/document/DocumentInfoField";
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
import { useApi } from "@/hooks/useApi";
import type { Document } from "@/types/entities";
import { convertToDocument } from "@/utils/convertToEntity";
import { formatFileSize } from "@/utils/fileSize";
import { Calendar, ChartPie, CircleUser, ExternalLink, File, Package, PenLine } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// Lazy-load PDFViewer so pdfjs-dist never runs on the server (no DOMMatrix in Node)
const PDFViewer = dynamic(() => import("@/components/document/pdf/PDFViewer"), { ssr: false });

export default function DocumentPreview({ id }: { id: string }) {

    const [document, setDocument] = useState<Document | null>(null);

    // Used to scale pdf width to fit its parent container
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const previewRef = useRef<HTMLDivElement>(null);

    const { user } = useUser();
    const { request, loading, error } = useApi();
    const { t } = useTranslation();
    const { i18n } = useTranslation();
    const currentLocale = i18n.language;
    const MAXWIDTH = 1000;

    useEffect(() => {
        const fetchDocumentData = async () => {
            const documentData = await request('GET', `/api/documents/${id}?lang=${currentLocale}`);
            if (!documentData) {
                return null;
            }
            setDocument(convertToDocument(documentData));
        };

        fetchDocumentData();
    }, [id, request, currentLocale]);

    useEffect(() => {
        logDocumentView(id);
    }, [id]);

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

    if (loading) return <LoadingPage />;

    if (error) {
        return <ErrorPage status={error.status} detail={error.message} />;
    }

    if (!document) return null;

    const isPdf = document.mimetype === "application/pdf" ||
        document.filename?.toLowerCase().endsWith('.pdf') ||
        document.contentUrl?.toLowerCase().endsWith('.pdf');
    const isImage = document.mimetype?.startsWith("image/") ||
        ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some(ext =>
            document.filename?.toLowerCase().endsWith(ext) ||
            document.contentUrl?.toLowerCase().endsWith(ext)
        );
    const canPreview = document.contentUrl && (isPdf || isImage);

    return (
        <div className="vtk-shell pb-16">
            {/* Editorial page head: breadcrumb kicker, document name as the display
                title, and the file facts as a right-aligned spec block. */}
            <PageHead
                kicker={
                    <DynamicBreadcrumb
                        course={document.course}
                        category={document.category}
                        document={document}
                    />
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
            <div className="mt-7 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="vtk-panel overflow-hidden">
                    <div className="flex items-center justify-between gap-3 border-b border-vtk-line px-4 py-3">
                        <VoteButton
                            type="document"
                            objectId={Number(id)}
                            disabled={!user}
                        />
                        <div className="flex items-center gap-2">
                            <DownloadSingleDocumentButton
                                document={document}
                                fileSize={document.fileSize ? formatFileSize(document.fileSize) : undefined}
                                disabled={!user}
                            />
                            {canPreview && (
                                <a
                                    href={`${document.contentUrl}?inline=1`}
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
                                src={`${document.contentUrl}?inline=1`}
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

                <DocumentCommentSection documentId={document.id} file={document.contentUrl} />
            </div>
        </div>
    )
}
