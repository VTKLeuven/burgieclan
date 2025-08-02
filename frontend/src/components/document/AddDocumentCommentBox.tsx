'use client'

import AddDocumentCommentModal from "@/components/document/AddDocumentCommentModal";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface AddDocumentCommentBoxProps {
    file?: string;
    content?: string;
}

export default function AddDocumentCommentBox({ file, content }: AddDocumentCommentBoxProps) {
    const { t } = useTranslation();

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="border rounded-lg max-w-sm p-2 min-h-20">
            <button
                className="flex flex-row justify-between pb-2 text-gray-600"
                onClick={() => setIsModalOpen(true)}>
                <span>{t("document.comments.add")}</span>
            </button>
            <AddDocumentCommentModal file={file} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
            <p className="text-sm">{content}</p>
        </div>
    );
}