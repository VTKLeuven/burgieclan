'use client'

import React from "react";
import VoteButton from "@/components/ui/buttons/VoteButton";

/**
 * Component for displaying a document comment
 * @param author  The author of the comment
 * @param content  The content of the comment
 * @param initialVotes  The initial number of votes for the comment
 * @constructor
 */
export default function DocumentComment({ author, content, initialVotes }) {
    const handleVote = async (delta: number) => {
        return (vote: number) => {
            console.log('vote registered:', delta, 'new vote:', vote);
        };
    };

    return (
        <div className="border rounded-lg max-w-sm p-2 h-fit">
            <div className="flex flex-row justify-between pb-2">
                <p className="font-bold">{author}</p>
                <VoteButton initialVotes={initialVotes} onVote={handleVote} className="py-1" />
            </div>
            <p className="text-sm">{content}</p>
        </div>
    );
}