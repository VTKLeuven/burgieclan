'use client';

import DocumentCommentSection from "@/components/document/DocumentCommentSection";
import DocumentInfoField from "@/components/document/DocumentInfoField";
import UnderReviewBox from "@/components/document/UnderReviewBox";
import ErrorPage from "@/components/error/ErrorPage";
import LoadingPage from "@/components/loading/LoadingPage";
import DownloadSingleDocumentButton from "@/components/ui/buttons/DownloadSingleDocumentButton";
import VoteButton, { VoteDirection } from "@/components/ui/buttons/VoteButton";
import FavoriteButton from "@/components/ui/FavoriteButton";
import { useUser } from "@/components/UserContext";
import { useApi } from "@/hooks/useApi";
import type { Document } from "@/types/entities";
import { convertToDocument } from "@/utils/convertToEntity";
import { Calendar, ChartPie, CircleUser, File, Package } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function DocumentPreview({ id }: { id: string }) {
    // Lazy load PDFViewer component
    const PDFViewer = dynamic(() => import("@/components/document/pdf/PDFViewer"), { ssr: false });

    const [document, setDocument] = useState<Document | null>(null);

    // Used to scale pdf width to fit its parent container
    const [containerWidth, setContainerWidth] = useState<number>(0);

    const { user } = useUser();
    const { request, loading, error } = useApi();
    const { t } = useTranslation();

    const MAXWIDTH = 1000;

    useEffect(() => {
        const fetchDocumentData = async () => {
            const documentData = await request('GET', `/api/documents/${id}`);
            if (!documentData) {
                return null;
            }

            setDocument(convertToDocument(documentData));
        };

        fetchDocumentData();
    }, [id, request]);

    // Update container width on mount and window resize, necessary to resize PDFViewer
    useEffect(() => {
        const updateWidth = () => {
            const width = window.innerWidth;
            setContainerWidth(width > 768 ? Math.min(width * 0.9, MAXWIDTH) : width - 32);
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    if (loading) return <LoadingPage />;

    if (error) {
        console.error(error);
        return <ErrorPage status={error.status} detail={error.message} />;
    }

    return (document &&
        <div className="p-8 flex-auto text-sm w-full">
            {/* Filename */}
            <span className="inline-flex items-center space-x-4">
                <File />
                <h3>{document.name}</h3>
            </span>

            {/* Description */}
            <div className="flex flex-row justify-between py-5">
                <div className="flex space-x-8">
                    {document.createdAt && <DocumentInfoField icon={Calendar} value={document.createdAt?.toLocaleDateString()} />}
                    <DocumentInfoField icon={Package} value="4 MB" />  {/*TODO: retrieve from api endpoint or calculate here*/}
                    {document.year && <DocumentInfoField icon={ChartPie} value={document.year} />}
                </div>
                <div>
                    <DocumentInfoField
                        icon={CircleUser}
                        value={document.anonymous ? t("document.anonymous") : document.creator?.fullName || ""}
                    />
                </div>
            </div>

            {/* Horizontal divider */}
            <div className="w-full border-t border-vtk-blue-600 pb-5" />

            {/* Under review box */}
            {document.underReview && (
                <UnderReviewBox />
            )}

            {/* Document preview & comment section */}
            <div className="flex flex-row space-x-4 w-full justify-center">
                <div style={{ width: containerWidth }} className="py-5">
                    <div className="flex flex-row h-8 justify-between place-items-center">
                        <VoteButton /* TODO: implement voting functionality */
                            initialVotes={10}
                            initialVote={VoteDirection.UP}
                            disabled={!user}
                            className="border-gray-500"
                        />
                        <div className="flex space-x-2">
                            <DownloadSingleDocumentButton
                                document={document}
                                fileSize="3.6 MB" /* TODO: retrieve from api endpoint or calculate here*/
                                disabled={!user}
                            />
                            <FavoriteButton
                                itemId={Number(id)}
                                itemType="document"
                            />
                        </div>
                    </div>

                    {/*TODO: expand preview to other file types*/}
                    {(document && document.mimetype == "application/pdf" && document.contentUrl) ? (
                        <PDFViewer file={document.contentUrl} width={containerWidth} />
                    ) : (
                        <div className="w-full h-96 flex items-center justify-center">
                            <p>{t('document.no-preview')}</p>
                        </div>
                    )}
                </div>
                <DocumentCommentSection/>
            </div>
        </div>
    )
}