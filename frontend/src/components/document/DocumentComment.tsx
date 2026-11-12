'use client'

import RichTextView from "@/components/editor/RichTextView";
import VoteButton from "@/components/ui/buttons/VoteButton";

interface DocumentCommentProps {
    id: number;
    author: string;
    content: string;
}

/**
 * Component for displaying a document comment
 * @param id  The id of the comment
 * @param author  The author of the comment
 * @param content  The content of the comment, HTML from the editor
 * @constructor
 */
export default function DocumentComment({ id, author, content }: DocumentCommentProps) {

    return (
        <div className="h-fit rounded-card border border-border bg-surface px-3.5 py-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="m-0 truncate text-small font-medium text-fg">{author}</p>
                <VoteButton type='document_comment' objectId={id} size="small" />
            </div>
            <RichTextView html={content} className="text-body text-fg-secondary" />
        </div>
    );
}