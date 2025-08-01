import { TriangleAlert } from "lucide-react";

export default function UnderReviewBox() {
    return (
        <div className="rounded-xl bg-yellow-50 p-4">
            <div className="flex">
                <div className="shrink-0">
                    <TriangleAlert aria-hidden="true" className="size-5 text-yellow-400"/>
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                        This document is currently under review, so it is only visible to you.
                    </h3>
                </div>
            </div>
        </div>
    )
}