import React, {useState} from 'react';
import { ArrowBigDownIcon, ArrowBigUpIcon } from "lucide-react";

export enum VoteDirection {
    UP = 'UP',
    DOWN = 'DOWN',
    NONE = 'NONE'
}

export interface VoteButtonProps {
    initialVotes: number;                       // The initial number of votes
    initialVote?: VoteDirection;                // The initial vote direction
    onVote: (delta : number) => Promise<void>;  // Callback when the vote button is clicked
    disabled?: boolean;                         // Whether the vote button is disabled (unclickable)
}

export default function VoteButton({
    initialVotes = 0,
    initialVote = VoteDirection.NONE,
    onVote,
    disabled = false
}: VoteButtonProps) {
    const [voteState, setVoteState] = useState<VoteDirection>(initialVote || VoteDirection.NONE);
    const [voteCount, setVoteCount] = useState(initialVotes);

    const handleVote = async (direction) => {
        if (disabled || direction == VoteDirection.NONE) return;

        try {
            const newVoteState = voteState === direction ? VoteDirection.NONE : direction;

            const delta = calculateVoteDelta(voteState, newVoteState);

            // Call parent handler
            await onVote(delta);

            // Update local state
            setVoteCount(prev => prev + delta);
            setVoteState(newVoteState);
        } catch (error) {
            // Revert on error
            setVoteCount(voteCount);
            setVoteState(voteState);
            console.error('Vote failed:', error);
        }
    };

    const calculateVoteDelta = (oldVote, newVote) => {
        if (oldVote === newVote) return 0;
        if (newVote === VoteDirection.NONE) return oldVote === VoteDirection.UP ? -1 : 1;
        if (oldVote === VoteDirection.NONE) return newVote === VoteDirection.UP ? 1 : -1;
        return newVote === VoteDirection.UP ? 2 : -2;
    };

    return (
        <span className={`inline-flex items-center p-1 border rounded-2xl space-x-1.5 
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      border-gray-500`}
        >
      <ArrowBigUpIcon
          size={20}
          strokeWidth="1.5"
          onClick={() => handleVote(VoteDirection.UP)}
          className={`
          ${disabled ? '' : 'hover:text-blue-500'}
          ${voteState === VoteDirection.UP ? 'text-blue-500 fill-blue-500' : 'text-gray-500'}
        `}
      />
      <div className={`text-sm ${
          voteState === VoteDirection.UP
              ? 'text-blue-500'
              : voteState === VoteDirection.DOWN
                  ? 'text-amber-600'
                  : ''
      }`}>
        {voteCount}
      </div>
      <ArrowBigDownIcon
          size={20}
          strokeWidth="1.5"
          onClick={() => handleVote(VoteDirection.DOWN)}
          className={`
          ${disabled ? '' : 'hover:text-amber-600'}
          ${voteState === VoteDirection.DOWN ? 'text-amber-600 fill-amber-600' : 'text-gray-500'}
        `}
      />
    </span>
    );
}