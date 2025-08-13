import { ArrowBigDownIcon, ArrowBigUpIcon } from "lucide-react";
import { useState } from 'react';

export enum VoteDirection {
    UP = 'UP',
    DOWN = 'DOWN',
    NONE = 'NONE'
}

export interface VoteButtonProps {
    initialVotes: number;                       // The initial number of votes
    initialVote?: VoteDirection;                // The initial vote direction
    onVote?: (delta: number) => Promise<(vote: number) => void>; // Callback when the vote button is clicked
    disabled?: boolean;                         // Whether the vote button is disabled (unclickable)
    className?: string;                         // Custom classes for the outer span element
}

export default function VoteButton({
    initialVotes = 0,
    initialVote = VoteDirection.NONE,
    onVote,
    disabled = false,
    className = ''
}: VoteButtonProps) {
    const [voteState, setVoteState] = useState<VoteDirection>(initialVote || VoteDirection.NONE);
    const [voteCount, setVoteCount] = useState(initialVotes);
    const [isUpvoteHovered, setIsUpvoteHovered] = useState(false);
    const [isDownvoteHovered, setIsDownvoteHovered] = useState(false);

    const handleVote = async (direction: VoteDirection) => {
        if (disabled || direction == VoteDirection.NONE) return;

        try {
            const newVoteState = voteState === direction ? VoteDirection.NONE : direction;

            const delta = calculateVoteDelta(voteState, newVoteState);

            // Run callback
            if (onVote) {
                await onVote(delta);
            }

            // TODO: Update vote count in backend (awaiting backend fix)

            // Update local state
            setVoteCount(prev => prev + delta);
            setVoteState(newVoteState);
        } catch (error) {
            // Revert on error
            setVoteCount(voteCount);
            setVoteState(voteState);
        }
    };

    // Calculate the vote delta (change in amount of votes) based on the old and new vote states
    const calculateVoteDelta = (oldVote: VoteDirection, newVote: VoteDirection) => {
        if (oldVote === newVote) return 0;
        if (newVote === VoteDirection.NONE) return oldVote === VoteDirection.UP ? -1 : 1;
        if (oldVote === VoteDirection.NONE) return newVote === VoteDirection.UP ? 1 : -1;
        return newVote === VoteDirection.UP ? 2 : -2;
    };

    return (
        <span className={`inline-flex items-center p-1 border rounded-2xl space-x-1.5 
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${className}`}
        >
            <ArrowBigUpIcon
                size={20}
                strokeWidth={isUpvoteHovered ? '2' : '1.5'}
                onMouseEnter={() => setIsUpvoteHovered(true)}
                onMouseLeave={() => setIsUpvoteHovered(false)}
                onClick={() => handleVote(VoteDirection.UP)}
                className={`
                    ${disabled ? '' : 'hover:text-amber-600'}
                    ${voteState === VoteDirection.UP ? 'text-amber-600 fill-amber-600' : 'text-gray-500'}
                `}
            />
            <div className={`text-sm ${voteState === VoteDirection.UP
                ? 'text-amber-600'
                : voteState === VoteDirection.DOWN
                    ? 'text-blue-500'
                    : ''
                }`}>
                {voteCount}
            </div>
            <ArrowBigDownIcon
                size={20}
                strokeWidth={isDownvoteHovered ? '2' : '1.5'}
                onMouseEnter={() => setIsDownvoteHovered(true)}
                onMouseLeave={() => setIsDownvoteHovered(false)}
                onClick={() => handleVote(VoteDirection.DOWN)}
                className={`
                    ${disabled ? '' : 'hover:text-blue-500'}
                    ${voteState === VoteDirection.DOWN ? 'text-blue-500 fill-blue-500' : 'text-gray-500'}
                `}
            />
        </span>
    );
}