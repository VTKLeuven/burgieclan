import { Calendar, CircleUser, File, Package, RefreshCcw } from "lucide-react";
import VoteButton, {VoteDirection} from "@/components/ui/buttons/VoteButton";
import DocumentInfoField from "@/components/document/DocumentInfoField";
import dynamic from "next/dynamic";
import {FavoriteButton} from "@/components/ui/buttons/FavoriteButton";
import {DownloadButton} from "@/components/ui/buttons/DownloadButton";

export default function DocumentPreview () {
    const PDFViewer = dynamic(() => import("@/components/pdf/PDFViewer"), { ssr: false, });

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
                </div>
                <div>
                    <DocumentInfoField icon={CircleUser} value={"Dries Vanspauwen"} />
                </div>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-vtk-blue-600" />

            <div className="flex flex-row justify-between py-5 place-items-center">
                <VoteButton
                    initialVotes={10}
                    initialVote={VoteDirection.UP}
                    onVote={handleVote}
                />
                {/*<DocumentInfoField className="text-gray-500" icon={RefreshCcw} value={"Last updated 20/10/2024 at 15:35"} />*/}
                <div className="flex space-x-2">
                    <DownloadButton  onDownload={handleDownload} fileSize="3.6 MB" />
                    <FavoriteButton  onFavorite={handleFavorite} />
                </div>
            </div>

            <PDFViewer fileArg="/documents/test.pdf"/>

        </div>
    )
}