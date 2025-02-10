'use client'

import React, {useState} from "react";
import VoteButton from "@/components/ui/buttons/VoteButton";
import AddDocumentCommentModal from "@/components/document/AddDocumentCommentModal";

export default function AddDocumentCommentBox({ author, content, initialVotes }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleVote = async (delta: number) => {
        return (vote: number) => {
            console.log('vote registered:', delta, 'new vote:', vote);
        };
    };

    return (
        <div className="border rounded-lg max-w-sm p-2 min-h-20">
            <button
                className="flex flex-row justify-between pb-2 text-gray-600"
                onClick={() => setIsModalOpen(true)}>
                Add comment...
            </button>
            <AddDocumentCommentModal isOpen={isModalOpen} setIsOpen={setIsModalOpen}/>
            <p className="text-sm">{content}</p>
        </div>
    );
}