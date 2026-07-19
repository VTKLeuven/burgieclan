'use client';

import DocumentCommentSection from "@/components/document/DocumentCommentSection";
import DocumentInfoField from "@/components/document/DocumentInfoField";
import UnderReviewBox from "@/components/document/UnderReviewBox";
import ErrorPage from "@/components/error/ErrorPage";
import LoadingPage from "@/components/loading/LoadingPage";
import DownloadSingleDocumentButton from "@/components/ui/buttons/DownloadSingleDocumentButton";
import VoteButton from "@/components/ui/buttons/VoteButton";
import DynamicBreadcrumb from "@/components/ui/DynamicBreadcrumb";
import FavoriteButton from "@/components/ui/FavoriteButton";
import { useUser } from "@/components/UserContext";
import { logDocumentView } from "@/hooks/logDocumentView";
import { useApi } from "@/hooks/useApi";
import type { Document } from "@/types/entities";
import { convertToDocument } from "@/utils/convertToEntity";
import { formatFileSize } from "@/utils/fileSize";
import { Calendar, ChartPie, CircleUser, File, Package } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function DocumentPreview({ id }: { id: string }) {
    // Lazy load PDFViewer component
    const PDFViewer = dynamic(() => import("@/components/document/pdf/PDFViewer"), { ssr: false });

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

    return (document &&
        <div className="vtk-shell pb-16">
            {/* Editorial page head: breadcrumb kicker, filename as the display
                title, and the file facts as a right-aligned spec block. */}
            <div className="vtk-page-head">
                <div>
                    <div className="vtk-page-kicker">
                        <DynamicBreadcrumb
                            course={document.course}
                            category={document.category}
                            document={document}
                        />
                    </div>
                    <div className="flex items-start gap-3">
                        <File className="mt-1.5 h-6 w-6 shrink-0 text-vtk-muted" />
                        <h1 className="vtk-page-title">{document.name}</h1>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                        {document.createdAt && <DocumentInfoField icon={Calendar} value={document.createdAt?.toLocaleDateString()} />}
                        {document.fileSize && <DocumentInfoField icon={Package} value={formatFileSize(document.fileSize)} />}
                        {document.year && <DocumentInfoField icon={ChartPie} value={document.year} />}
                        <DocumentInfoField
                            icon={CircleUser}
                            value={document.anonymous ? t("document.anonymous") : document.creator?.fullName || ""}
                        />
                    </div>
                </div>
            </div>

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
                                fileSize={document.fileSize ? formatFileSize(document.fileSize) : "Unknown size"}
                                disabled={!user}
                            />
                            <FavoriteButton
                                itemId={Number(id)}
                                itemType="document"
                                size={18}
                            />
                        </div>
                    </div>

                    {/*TODO: expand preview to other file types*/}
                    <div ref={previewRef} className="flex justify-center overflow-x-auto bg-vtk-paper-2 p-4">
                        {(document && document.mimetype == "application/pdf" && document.contentUrl) ? (
                            <PDFViewer file={document.contentUrl} width={containerWidth} />
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
