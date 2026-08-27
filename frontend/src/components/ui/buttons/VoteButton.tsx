import { isErrorResponse, useApi } from "@/hooks/useApi";
import { convertToVoteSummary } from "@/utils/convertToEntity";
import { ArrowBigDownIcon, ArrowBigUpIcon } from "lucide-react";
import { useEffect, useRef, useState } from 'react';

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
    const buttonRef = useRef<HTMLSpanElement>(null);
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
        let cancelled = false;

        async function getVoteSummary() {
            const result = await request('GET', apiEndpoint);
            if (!result || cancelled) {
                return;
            }

            const voteSummary = convertToVoteSummary(result);

            setVoteState(voteSummary.currentUserVote);
            setVoteCount(voteSummary.sum);
        }

        const element = buttonRef.current;
        if (!element || typeof IntersectionObserver === 'undefined') {
            void getVoteSummary();
            return () => {
                cancelled = true;
            };
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) {
                    return;
                }

                observer.disconnect();
                void getVoteSummary();
            },
            // Start shortly before the row scrolls into view, without issuing one request for
            // every document in a long category as soon as the page mounts.
            { rootMargin: '200px' }
        );
        observer.observe(element);

        return () => {
            cancelled = true;
            observer.disconnect();
        };
    }, [apiEndpoint, request]);


    const handleVote = async (direction: VoteDirection) => {
        if (disabled) return;

        const newVoteState = voteState === direction ? VoteDirection.NONE : direction;

        const delta = calculateVoteDelta(voteState, newVoteState);

        const result = await request('POST', apiEndpoint, {
            voteType: direction
        });

        if (!result || isErrorResponse(result)) {
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
        // Both directions read on the navy scale; the active state is an ink
        // fill rather than a second accent colour.
        <span ref={buttonRef} className={`inline-flex items-center rounded-full border border-vtk-line-2 bg-vtk-surface
            ${padding} ${spacing}
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            ${className}`}
        >
            <ArrowBigUpIcon
                size={iconSize}
                strokeWidth={isUpvoteHovered ? '2' : '1.5'}
                onMouseEnter={() => setIsUpvoteHovered(true)}
                onMouseLeave={() => setIsUpvoteHovered(false)}
                onClick={() => handleVote(VoteDirection.UP)}
                className={`transition-colors
                    ${disabled ? '' : 'hover:text-vtk-ink'}
                    ${voteState === VoteDirection.UP ? 'fill-vtk-ink text-vtk-ink' : 'text-vtk-muted'}
                `}
            />
            <div className={`${textSize} min-w-4 text-center tabular-nums ${voteState === VoteDirection.NONE ? 'text-vtk-body' : 'font-semibold text-vtk-ink'
                }`}>
                {voteCount}
            </div>
            <ArrowBigDownIcon
                size={iconSize}
                strokeWidth={isDownvoteHovered ? '2' : '1.5'}
                onMouseEnter={() => setIsDownvoteHovered(true)}
                onMouseLeave={() => setIsDownvoteHovered(false)}
                onClick={() => handleVote(VoteDirection.DOWN)}
                className={`transition-colors
                    ${disabled ? '' : 'hover:text-vtk-ink'}
                    ${voteState === VoteDirection.DOWN ? 'fill-vtk-ink text-vtk-ink' : 'text-vtk-muted'}
                `}
            />
        </span>
    );
}
