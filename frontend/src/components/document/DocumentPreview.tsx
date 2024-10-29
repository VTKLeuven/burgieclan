import { Calendar, CircleUser, File, Package, RefreshCcw } from "lucide-react";
import VoteButton from "@/components/ui/VoteButton";
import DocumentInfoField from "@/components/document/DocumentInfoField";

export default function DocumentPreview () {
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
                <VoteButton/>
                <DocumentInfoField className="text-gray-500" icon={RefreshCcw} value={"Last updated 20/10/2024 at 15:35"} />
            </div>

        </div>
    )
}