import {Calendar, CircleUser, File, Package, ChartPie} from "lucide-react";
import VoteButton, {VoteDirection} from "@/components/ui/buttons/VoteButton";
import DocumentInfoField from "@/components/document/DocumentInfoField";
import dynamic from "next/dynamic";
import FavoriteButton from "@/components/ui/buttons/FavoriteButton";
import DownloadButton from "@/components/ui/buttons/DownloadButton";
import {ExclamationTriangleIcon} from "@heroicons/react/16/solid";
import {useEffect, useState} from "react";
import DocumentCommentSection from "@/components/document/DocumentCommentSection";
import LoadingPage from "@/components/loading/LoadingPage";
import Error from "@/app/[locale]/error";
import ErrorPage from "@/components/error/ErrorPage";
import {ApiClient} from "@/actions/api";

interface DocumentData {
    "@context": string;
    "@id": string;
    "@type": string;
    name: string;
    course: string;
    category: string;
    year: string;
    under_review: boolean;
    creator: string;
    createdAt: string;
    updatedAt: string;
}

export default function DocumentPreview({id}: { id: string }) {
    const PDFViewer = dynamic(() => import("@/components/pdf/PDFViewer"), {ssr: false,});

    // Document data state
    const [documentData, setDocumentData] = useState<DocumentData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Used to scale pdf width to fit its parent container
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [isAnonymous, setIsAnonymous] = useState(false);

    const MAXWIDTH = 1000;

    useEffect(() => {
        const fetchDocumentData = async () => {
            const result = await ApiClient('GET', `/api/documents/${id}`); // Adjust the endpoint as needed
            console.log(result);
            if (result.error) setError('Failed to fetch document data');
            setDocumentData(result);
            setIsLoading(false);
        };
        console.log("fetching document")
        fetchDocumentData();
    }, []);

    useEffect(() => {
        const updateWidth = () => {
            const width = window.innerWidth;
            setContainerWidth(width > 768 ? Math.min(width * 0.9, MAXWIDTH) : width - 32);
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const handleVote = async (delta: number) => {
        return (vote: number) => {
            console.log('vote registered:', delta, 'new vote:', vote);
        };
    };

    const handleFavorite = async (isFavorite: boolean) => {
        console.log('favorite status changed:', isFavorite);
    }

    const handleDownload = async () => {
        console.log('download started');
    }

    if (isLoading) return <LoadingPage />;
    if (error) {
        console.error(error);
        return <ErrorPage />;
    }
    if (!documentData) return <div>No document data available</div>;

    // Format the date for display
    const formattedDate = new Date(documentData.createdAt).toLocaleDateString();

    return (
        <div className="p-8 flex-auto text-sm">
            {/* Filename */}
            <span className="inline-flex items-center space-x-4">
                <File/>
                <h3>{documentData.name}</h3>
            </span>

            {/* Description */}
            <div className="flex flex-row justify-between py-5">
                <div className="flex space-x-8">
                    <DocumentInfoField icon={Calendar} value={formattedDate}/>
                    <DocumentInfoField icon={Package} value="4 MB"/>
                    <DocumentInfoField icon={ChartPie} value={documentData.year}/>
                </div>
                <div>
                    <DocumentInfoField
                        icon={CircleUser}
                        value={isAnonymous ? "Anonymous" : documentData.creator}
                    />
                </div>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-vtk-blue-600 pb-5"/>

            {documentData.under_review && (
                <div className="rounded-xl bg-yellow-50 p-4">
                    <div className="flex">
                        <div className="shrink-0">
                            <ExclamationTriangleIcon aria-hidden="true" className="size-5 text-yellow-400"/>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                This document is currently under review, so it is only visible to you.
                            </h3>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-row space-x-4 w-full justify-center">
                <div className="">
                    <div style={{ width: containerWidth }} className="py-5">
                        <div className="flex flex-row h-8 justify-between place-items-center">
                            <VoteButton
                                initialVotes={10}
                                initialVote={VoteDirection.UP}
                                onVote={handleVote}
                                className="border-gray-500"
                            />
                            <div className="flex space-x-2">
                                <DownloadButton onDownload={handleDownload} fileSize="3.6 MB"/>
                                <FavoriteButton onFavorite={handleFavorite}/>
                            </div>
                        </div>

                        <PDFViewer fileArg="/documents/test.pdf" width={containerWidth}/>
                    </div>
                </div>
                <DocumentCommentSection/>
            </div>
        </div>
    )
}