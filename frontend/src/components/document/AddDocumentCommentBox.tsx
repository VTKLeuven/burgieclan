'use client';

import { MessageSquarePlus } from 'lucide-react';
import AddDocumentCommentModal from "@/components/document/AddDocumentCommentModal";
import type { DocumentComment } from "@/types/entities";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface AddDocumentCommentBoxProps {
    documentId: number;
    file?: string;
    content?: string;
    onCommentAdded?: (newComment: DocumentComment) => void;
}

export default function AddDocumentCommentBox({ documentId, file, content, onCommentAdded }: AddDocumentCommentBoxProps) {
    const { t } = useTranslation();

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div>
            {/* Looks like the composer it opens, as at the bottom of a Dopl timeline. */}
            <button
                type="button"
                className="flex h-9 w-full items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-left text-body text-fg-placeholder shadow-xs transition-colors hover:border-neutral-300"
                onClick={() => setIsModalOpen(true)}>
                <MessageSquarePlus className="size-4 shrink-0 text-icon" aria-hidden="true" />
                <span className="truncate">{t("document.comments.add")}</span>
            </button>
            <AddDocumentCommentModal
                documentId={documentId}
                file={file}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                onCommentAdded={onCommentAdded}
            />
            {content && <p className="mt-2 text-small text-fg-muted">{content}</p>}
        </div>
    );
}