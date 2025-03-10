import {Calendar, CircleUser, File, Package, ChartPie} from "lucide-react";
import VoteButton, {VoteDirection} from "@/components/ui/buttons/VoteButton";
import DocumentInfoField from "@/components/document/DocumentInfoField";
import dynamic from "next/dynamic";
import FavoriteButton from "@/components/ui/buttons/FavoriteButton";
import DownloadButton from "@/components/ui/buttons/DownloadButton";
import {useEffect, useState} from "react";
import DocumentCommentSection from "@/components/document/DocumentCommentSection";
import LoadingPage from "@/components/loading/LoadingPage";
import ErrorPage from "@/components/error/ErrorPage";
import {ApiClient} from "@/actions/api";
import UnderReviewBox from "@/components/document/UnderReviewBox";
import {useUser} from "@/components/UserContext";

/**
 * TODO:
 * -
 * -
 */

interface DocumentData {
    "@context": string;
    "@id": string;
    "@type": string;
    name: string;
    course: string;
    category: string;
    year: string;
    under_review: boolean;
    contentUrl: string;
    mimetype: string;
    filename : string;
    creator: string;
    createdAt: string;
    updatedAt: string;
}

export default function DocumentPreview({id}: { id: string }) {
    // Lazy load PDFViewer component
    const PDFViewer = dynamic(() => import("@/components/document/pdf/PDFViewer"), {ssr: false,});

    // Document data state
    const [documentData, setDocumentData] = useState<DocumentData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Used to scale pdf width to fit its parent container
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [isAnonymous, setIsAnonymous] = useState(false);

    // User data
    const { user } = useUser();

    const MAXWIDTH = 1000;

    useEffect(() => {
        const fetchDocumentData = async () => {
            try {
                const result = await ApiClient('GET', `/api/documents/${id}`);
                if (result.error) {
                    setError('Failed to fetch document data');
                    return;
                }
                setDocumentData(result);
                setIsLoading(false);
            } catch (err) {
                setError('Failed to fetch document data');
                setIsLoading(false);
            }
        };

        fetchDocumentData();
    }, [id]);

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

    if (isLoading) return <LoadingPage className="w-full"/>

    if (error) {
        console.error(error);
        return <ErrorPage className="w-full"/>;
    }

    if (!documentData) return <div>No document data available</div>;

    // Format the date for display
    const formattedDate = new Date(documentData.createdAt).toLocaleDateString();

    return (
        <div className="p-8 flex-auto text-sm w-full">
            {/* Filename */}
            <span className="inline-flex items-center space-x-4">
                <File/>
                <h3>{documentData.name}</h3>
            </span>

            {/* Description */}
            <div className="flex flex-row justify-between py-5">
                <div className="flex space-x-8">
                    <DocumentInfoField icon={Calendar} value={formattedDate}/>
                    <DocumentInfoField icon={Package} value="4 MB"/>  {/*TODO: retrieve from api endpoint or calculate here*/}
                    <DocumentInfoField icon={ChartPie} value={documentData.year}/>
                </div>
                <div>
                    <DocumentInfoField
                        icon={CircleUser}
                        value={isAnonymous ? "Anonymous" : documentData.creator}
                    />
                </div>
            </div>

            {/* Horizontal divider */}
            <div className="w-full border-t border-vtk-blue-600 pb-5"/>

            {/* Under review box */}
            {documentData.under_review && (
                <UnderReviewBox />
            )}

            {/* Document preview & comment section */}
            <div className="flex flex-row space-x-4 w-full justify-center">
                <div style={{ width: containerWidth }} className="py-5">
                    <div className="flex flex-row h-8 justify-between place-items-center">
                        <VoteButton
                            initialVotes={10}
                            initialVote={VoteDirection.UP}
                            disabled={!user}
                            className="border-gray-500"
                        />
                        <div className="flex space-x-2">
                            <DownloadButton
                                contentUrl={documentData.contentUrl}
                                fileName={documentData.filename}
                                fileSize="3.6 MB"
                                disabled={!user}
                            />
                            <FavoriteButton
                                favoriteType="documents"
                                resourceId={Number(id)}
                                disabled={!user}
                            />
                        </div>
                    </div>

                    {/*TODO: expand preview to other file types*/}
                    {(documentData && documentData.mimetype == "application/pdf") ? (
                        <PDFViewer fileArg={process.env.NEXT_PUBLIC_BACKEND_URL + documentData.contentUrl} width={containerWidth} />
                    ) : (
                        <div className="w-full h-96 flex items-center justify-center">
                            <p>No preview available</p>
                        </div>
                    )}
                </div>
                <DocumentCommentSection/>
            </div>
        </div>
    )
}