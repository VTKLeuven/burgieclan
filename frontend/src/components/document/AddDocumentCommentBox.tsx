'use client'

import AddDocumentCommentModal from "@/components/document/AddDocumentCommentModal";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface AddDocumentCommentBoxProps {
    documentId: number;
    file?: string;
    content?: string;
}

export default function AddDocumentCommentBox({ documentId, file, content }: AddDocumentCommentBoxProps) {
    const { t } = useTranslation();

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="border rounded-lg max-w-sm p-2 min-h-20">
            <button
                className="flex flex-row justify-between pb-2 text-gray-600"
                onClick={() => setIsModalOpen(true)}>
                <span>{t("document.comments.add")}</span>
            </button>
            <AddDocumentCommentModal documentId={documentId} file={file} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
            <p className="text-sm">{content}</p>
        </div>
    );
}