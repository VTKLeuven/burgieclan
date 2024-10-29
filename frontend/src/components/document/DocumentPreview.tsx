import {Calendar, CircleUser, File, Package} from "lucide-react";
import UpvoteButton from "@/components/ui/UpvoteButton";

export default function DocumentPreview () {
    return (
        <div className="p-8 flex-auto">
            {/* Filename */}
            <span className="inline-flex items-center space-x-4">
                <File/>
                <h3>Title of document</h3>
            </span>

            {/* Description */}
            <div className="flex flex-row justify-between py-6">
                <div className="flex space-x-8">
                    <span className="inline-flex items-center space-x-2">
                        <Calendar size={18}/>
                        <span>2021-01-01</span>
                    </span>
                    <span className="inline-flex items-center space-x-2">
                        <Package size={18}/>
                        <span>4 MB</span>
                    </span>
                </div>
                <div>
                    <span className="inline-flex items-center space-x-2">
                        <CircleUser size={18}/>
                        <span>Dries Vanspauwen</span>
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-vtk-blue-600" />

            <div className="flex flex-row justify-between py-6">
                <UpvoteButton />
                <p className="text-gray-500">Last updated 20/10/2024 at 15:35</p>
            </div>

        </div>
    )
}