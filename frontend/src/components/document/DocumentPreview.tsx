import {Calendar, CircleUser, File, Package, ChartPie} from "lucide-react";
import VoteButton, {VoteDirection} from "@/components/ui/buttons/VoteButton";
import DocumentInfoField from "@/components/document/DocumentInfoField";
import dynamic from "next/dynamic";
import FavoriteButton from "@/components/ui/buttons/FavoriteButton";
import DownloadButton from "@/components/ui/buttons/DownloadButton";
import {ExclamationTriangleIcon} from "@heroicons/react/16/solid";
import {useEffect, useState} from "react";
import DocumentCommentSection from "@/components/document/DocumentCommentSection";

export default function DocumentPreview() {
    const PDFViewer = dynamic(() => import("@/components/pdf/PDFViewer"), {ssr: false,});

    // Used to scale pdf width to fit its parent container
    const [containerWidth, setContainerWidth] = useState<number>(0);

    const [underReview, setUnderReview] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);

    const MAXWIDTH = 1000;

    useEffect(() => {
        const updateWidth = () => {
            const width = window.innerWidth;
            // Account for padding on mobile
            setContainerWidth(width > 768 ? Math.min(width * 0.9, MAXWIDTH) : width - 32);
        };

        // Set initial width
        updateWidth();

        // Update width on resize
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

    return (
        <div className="p-8 flex-auto text-sm">
            {/* Filename */}
            <span className="inline-flex items-center space-x-4">
                        <File/>
                        <h3>Title of document</h3>
                    </span>

            {/* Description */}
            <div className="flex flex-row justify-between py-5">
                <div className="flex space-x-8">
                    <DocumentInfoField icon={Calendar} value="2021-01-01"/>
                    <DocumentInfoField icon={Package} value="4 MB"/>
                    <DocumentInfoField icon={ChartPie} value="Year 1 - sem 2"/>
                </div>
                <div>
                    <DocumentInfoField icon={CircleUser} value={
                        isAnonymous ? "Anonymous" : "Dries Vanspauwen"
                    }/>
                </div>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-vtk-blue-600 pb-5"/>

            {underReview && (
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
                    <div style={{ width: containerWidth }} className="py-2.5">
                        <div className="flex flex-row h-8 justify-between place-items-center">
                            <VoteButton
                                initialVotes={10}
                                initialVote={VoteDirection.UP}
                                onVote={handleVote}
                                className="border-gray-500"
                            />
                            {/*<DocumentInfoField className="text-gray-500" icon={RefreshCcw} value={"Last updated 20/10/2024 at 15:35"} />*/}
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