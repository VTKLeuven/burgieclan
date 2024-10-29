import {Calendar, CircleUser, File, Package, RefreshCcw} from "lucide-react";
import UpvoteButton from "@/components/ui/UpvoteButton";

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
                    <span className="inline-flex items-center space-x-2">
                        <Calendar size={18}/>
                        <div>2021-01-01</div>
                    </span>
                    <span className="inline-flex items-center space-x-2">
                        <Package size={18}/>
                        <div>4 MB</div>
                    </span>
                </div>
                <div>
                    <span className="inline-flex items-center space-x-2">
                        <CircleUser size={18}/>
                        <div>Dries Vanspauwen</div>
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-vtk-blue-600" />

            <div className="flex flex-row justify-between py-5 place-items-center">
                <UpvoteButton/>
                <span className="inline-flex items-center space-x-2 text-gray-500">
                    <RefreshCcw size={18}/>
                    <div>Last updated 20/10/2024 at 15:35</div>
                </span>

            </div>

        </div>
    )
}