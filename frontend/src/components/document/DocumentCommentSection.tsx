import AddDocumentCommentBox from "@/components/document/AddDocumentCommentBox";
import DocumentComment from "@/components/document/DocumentComment";
import { useApi } from "@/hooks/useApi";
import type { DocumentComment as DocumentCommentEntity } from "@/types/entities";
import { convertToDocumentComment } from "@/utils/convertToEntity";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface DocumentCommentSectionProps {
    documentId: number;
    file?: string;
}

export default function DocumentCommentSection({ documentId, file }: DocumentCommentSectionProps) {
    const [comments, setComments] = useState<DocumentCommentEntity[]>([]);
    const { request } = useApi();
    const { t } = useTranslation();

    useEffect(() => {
        async function getComments() {
            const commentsData = await request('GET', `/api/document_comments?document=/api/documents/${documentId}`);

            if (!commentsData) {
                return null;
            }

            setComments(commentsData['hydra:member'].map(convertToDocumentComment));
        }

        getComments();
    }, [documentId, request]);

    const handleCommentAdded = useCallback((newComment: DocumentCommentEntity) => {
        setComments(prevComments => [...prevComments, newComment]);
    }, []);

    return (
        <>
            <div className="space-y-4 py-2.5">
                <div className="h-8"></div>
                {/*Allow users to add comments*/}
                <AddDocumentCommentBox
                    documentId={documentId}
                    file={file}
                    onCommentAdded={handleCommentAdded}
                />

                {/*Display existing comments*/}
                {comments.map((comment) => (
                    <DocumentComment
                        key={comment.id}
                        author={comment.creator?.fullName || t("document.anonymous")}
                        content={comment.content ?? ''}
                        initialVotes={Math.floor(Math.random() * 10)} // TODO replace with actual vote count
                    />
                ))}
            </div>
        </>
    );
}