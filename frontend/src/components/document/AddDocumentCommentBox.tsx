'use client';

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
        <div className="border rounded-lg max-w-sm p-2 min-h-20">
            <button
                className="flex flex-row justify-between pb-2 text-gray-600"
                onClick={() => setIsModalOpen(true)}>
                <span className="text-left">{t("document.comments.add")}</span>
            </button>
            <AddDocumentCommentModal
                documentId={documentId}
                file={file}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                onCommentAdded={onCommentAdded}
            />
            <p className="text-sm">{content}</p>
        </div>
    );
}