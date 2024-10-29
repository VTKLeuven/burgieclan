import {ArrowDownIcon, ArrowUpIcon} from "lucide-react";

export default function UpvoteButton() {
    return (
        <span className="inline-flex items-center p-1 border border-gray-500 rounded-2xl space-x-1.5">
            <ArrowUpIcon size={14} className="text-gray-500" />
            <div className="text-sm">15</div>
            <ArrowDownIcon size={14} className="text-gray-500" />
        </span>

    );
}