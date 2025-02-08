import { Calendar, CircleUser, File, Package, ChartPie } from "lucide-react";
import VoteButton, {VoteDirection} from "@/components/ui/buttons/VoteButton";
import DocumentInfoField from "@/components/document/DocumentInfoField";
import dynamic from "next/dynamic";
import {FavoriteButton} from "@/components/ui/buttons/FavoriteButton";
import {DownloadButton} from "@/components/ui/buttons/DownloadButton";
import {ExclamationTriangleIcon} from "@heroicons/react/16/solid";
import {useState} from "react";

export default function DocumentPreview () {
    const PDFViewer = dynamic(() => import("@/components/pdf/PDFViewer"), { ssr: false, });

    const [underReview, setUnderReview] = useState(true);
    const [isAnonymous, setIsAnonymous] = useState(true);

    const handleVote = async (delta : number) => {
        console.log('vote registered:', delta);
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
                    <DocumentInfoField icon={ChartPie} value="Year 1 - sem 2" />
                </div>
                <div>
                    <DocumentInfoField icon={CircleUser} value={
                        isAnonymous ? "Anonymous" : "Dries Vanspauwen"
                    } />
                </div>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-vtk-blue-600 pb-5" />

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

            <div className="flex flex-row justify-between py-5 place-items-center">
                <VoteButton
                    initialVotes={10}
                    initialVote={VoteDirection.UP}
                    onVote={handleVote}
                />
                {/*<DocumentInfoField className="text-gray-500" icon={RefreshCcw} value={"Last updated 20/10/2024 at 15:35"} />*/}
                <div className="flex space-x-2">
                    <DownloadButton onDownload={handleDownload} fileSize="3.6 MB"/>
                    <FavoriteButton onFavorite={handleFavorite}/>
                </div>
            </div>

            <PDFViewer fileArg="/documents/test.pdf"/>

        </div>
    )
}