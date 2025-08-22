import AddDocumentCommentBox from "@/components/document/AddDocumentCommentBox";
import DocumentComment from "@/components/document/DocumentComment";
import { useApi } from "@/hooks/useApi";
import type { Document, DocumentComment as DocumentCommentEntity } from "@/types/entities";
import { convertToDocumentComment } from "@/utils/convertToEntity";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface DocumentCommentSectionProps {
    document: Document;
    file?: string;
}

export default function DocumentCommentSection({ document, file }: DocumentCommentSectionProps) {
    const [comments, setComments] = useState<DocumentCommentEntity[]>([]);
    const { request } = useApi();
    const { t } = useTranslation();

    useEffect(() => {
        async function getComments() {
            const commentsData = await request('GET', `/api/document_comments?document=/api/documents/${document.id}`);

            if (!commentsData) {
                return null;
            }

            setComments(commentsData['hydra:member'].map(convertToDocumentComment));
        }

        getComments();
    }, [document.id, request]);

    return (
        <>
            <div className="space-y-4 py-2.5">
                <div className="h-8"></div>
                {/*Allow users to add comments*/}
                <AddDocumentCommentBox file={file} />

                {/*Display existing comments*/}
                {comments.map((comment, index) => (
                    <DocumentComment
                        key={index}
                        author={comment.creator?.fullName || t("document.anonymous")}
                        content={comment.content ?? ''}
                        initialVotes={Math.floor(Math.random() * 10)} // TODO replace with actual vote count
                    />
                ))}
            </div>
        </>
    );
}