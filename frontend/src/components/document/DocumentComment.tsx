'use client'

import VoteButton from "@/components/ui/buttons/VoteButton";
import { useSanitizedComment } from "@/utils/sanitizeAndRenderComment";

interface DocumentCommentProps {
    id: number;
    author: string;
    content: string;
}

/**
 * Component for displaying a document comment
 * @param id  The id of the comment
 * @param author  The author of the comment
 * @param content  The content of the comment (HTML from TipTap editor)
 * @constructor
 */
export default function DocumentComment({ id, author, content }: DocumentCommentProps) {
    const { sanitizedHTML, containerRef } = useSanitizedComment(content);

    return (
        <div className="border rounded-lg max-w-sm p-2 h-fit">
            <div className="flex flex-row justify-between pb-2">
                <p className="font-bold">{author}</p>
                <VoteButton type='document_comment' objectId={id} className="py-1" />
            </div>
            <div 
                ref={containerRef}
                className="text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedHTML }} 
            />
        </div>
    );
}