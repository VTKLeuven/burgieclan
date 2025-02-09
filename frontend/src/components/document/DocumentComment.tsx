'use client'

import React from "react";
import VoteButton from "@/components/ui/buttons/VoteButton";

export default function DocumentComment({ author, content, initialVotes }) {
    const handleVote = async (delta: number) => {
        return (vote: number) => {
            console.log('vote registered:', delta, 'new vote:', vote);
        };
    };

    return (
        <div className="border rounded-lg max-w-sm px-3 py-1.5 h-fit">
            <div className="flex flex-row justify-between pb-2">
                <p className="font-bold">{author}</p>
                <VoteButton initialVotes={initialVotes} onVote={handleVote} />
            </div>
            <p className="text-sm">{content}</p>
        </div>
    );
}