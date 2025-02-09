'use client'

import React from "react";
import VoteButton from "@/components/ui/buttons/VoteButton";

export default function AddDocumentCommentBox({ author, content, initialVotes }) {
    const handleVote = async (delta: number) => {
        return (vote: number) => {
            console.log('vote registered:', delta, 'new vote:', vote);
        };
    };

    return (
        <div className="border rounded-lg max-w-sm p-2 min-h-20">
            <div className="flex flex-row justify-between pb-2 text-gray-600">
                Add comment...
            </div>
            <p className="text-sm">{content}</p>
        </div>
    );
}