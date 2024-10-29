import {ArrowDownIcon, ArrowUpIcon} from "lucide-react";

export default function UpvoteButton() {
    return (
        <span className="inline-flex items-center p-1 border border-gray-500 rounded-2xl space-x-1.5">
            <ArrowUpIcon size={14} className="text-gray-500" />
            <p className="text-sm">15</p>
            <ArrowDownIcon size={14} className="text-gray-500" />
        </span>

    );
}