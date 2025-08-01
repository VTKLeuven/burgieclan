'use client'

import VoteButton from "@/components/ui/buttons/VoteButton";

interface DocumentCommentProps {
    author: string;
    content: string;
    initialVotes: number;
}

/**
 * Component for displaying a document comment
 * @param author  The author of the comment
 * @param content  The content of the comment
 * @param initialVotes  The initial number of votes for the comment
 * @constructor
 */
export default function DocumentComment({ author, content, initialVotes }: DocumentCommentProps) {
    const handleVote = async (delta: number) => {
        return (vote: number) => {
            console.log('vote registered:', delta, 'new vote:', vote); // TODO replace with actual vote handling logic (best in the votebutton itself)
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