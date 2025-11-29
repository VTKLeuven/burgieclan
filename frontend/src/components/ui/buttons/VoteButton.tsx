import { useApi } from "@/hooks/useApi";
import { convertToVoteSummary } from "@/utils/convertToEntity";
import { ArrowBigDownIcon, ArrowBigUpIcon } from "lucide-react";
import { useEffect, useState } from 'react';

export enum VoteDirection {
    UP = 1,
    DOWN = -1,
    NONE = 0
}

export interface VoteButtonProps {
    type: 'course_comment' | 'document_comment' | 'document';
    objectId: number;
    disabled?: boolean;                         // Whether the vote button is disabled (unclickable)
    className?: string;                         // Custom classes for the outer span element
    size?: 'small' | 'normal';                 // Size variant for the vote button
}

export default function VoteButton({
    type,
    objectId,
    disabled = false,
    className = '',
    size = 'normal'
}: VoteButtonProps) {
    const [voteState, setVoteState] = useState<VoteDirection>(VoteDirection.NONE);
    const [voteCount, setVoteCount] = useState(0);
    const [isUpvoteHovered, setIsUpvoteHovered] = useState(false);
    const [isDownvoteHovered, setIsDownvoteHovered] = useState(false);
    const { request } = useApi();

    let apiEndpoint = '';
    switch (type) {
        case 'course_comment':
            apiEndpoint = `/api/course-comments/${objectId}/votes`;
            break;
        case 'document_comment':
            apiEndpoint = `/api/document-comments/${objectId}/votes`;
            break;
        case 'document':
            apiEndpoint = `/api/documents/${objectId}/votes`;
            break;
        default:
            throw new Error('Invalid vote type');
    }

    useEffect(() => {
        async function getVoteSummary() {
            const result = await request('GET', apiEndpoint);
            if (!result) {
                return;
            }

            const voteSummary = convertToVoteSummary(result);

            setVoteState(voteSummary.currentUserVote);
            setVoteCount(voteSummary.sum);
        }
        getVoteSummary();
    }, [apiEndpoint, request]);


    const handleVote = async (direction: VoteDirection) => {
        if (disabled) return;

        const newVoteState = voteState === direction ? VoteDirection.NONE : direction;

        const delta = calculateVoteDelta(voteState, newVoteState);

        console.log({ apiEndpoint, direction, delta, voteCount, newVoteCount: voteCount + delta });
        const result = await request('POST', apiEndpoint, {
            voteType: direction
        });

        if (!result || result.error) {
            setVoteState(voteState);
            setVoteCount(voteCount);
        }

        // Update local state
        setVoteCount(prev => prev + delta);
        setVoteState(newVoteState);
    };

    // Calculate the vote delta (change in amount of votes) based on the old and new vote states
    // From NONE to UP, returns 1
    // From UP to DOWN, returns -2
    // From DOWN to NONE, returns 1
    // From NONE to DOWN, returns -1
    // From DOWN to UP, returns 2
    // Same vote, returns 0
    const calculateVoteDelta = (oldVote: VoteDirection, newVote: VoteDirection) => {
        return newVote - oldVote;
    };

    const iconSize = size === 'small' ? 16 : 20;
    const textSize = size === 'small' ? 'text-xs' : 'text-sm';
    const padding = size === 'small' ? 'p-0.5' : 'p-1';
    const spacing = size === 'small' ? 'space-x-1' : 'space-x-1.5';

    return (
        <span className={`inline-flex items-center border rounded-2xl 
            ${padding} ${spacing}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${className}`}
        >
            <ArrowBigUpIcon
                size={iconSize}
                strokeWidth={isUpvoteHovered ? '2' : '1.5'}
                onMouseEnter={() => setIsUpvoteHovered(true)}
                onMouseLeave={() => setIsUpvoteHovered(false)}
                onClick={() => handleVote(VoteDirection.UP)}
                className={`
                    ${disabled ? '' : 'hover:text-amber-600'}
                    ${voteState === VoteDirection.UP ? 'text-amber-600 fill-amber-600' : 'text-gray-500'}
                `}
            />
            <div className={`${textSize} min-w-4 text-center ${voteState === VoteDirection.UP
                ? 'text-amber-600'
                : voteState === VoteDirection.DOWN
                    ? 'text-blue-500'
                    : ''
                }`}>
                {voteCount}
            </div>
            <ArrowBigDownIcon
                size={iconSize}
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