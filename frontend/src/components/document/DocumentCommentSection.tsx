import AddDocumentCommentBox from "@/components/document/AddDocumentCommentBox";
import DocumentComment from "@/components/document/DocumentComment";
import { HydraCollection, readPreloadedApi, useApi } from "@/hooks/useApi";
import type { DocumentComment as DocumentCommentEntity } from "@/types/entities";
import { convertToDocumentComment } from "@/utils/convertToEntity";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface DocumentCommentSectionProps {
    documentId: number;
    file?: string;
}

export default function DocumentCommentSection({ documentId, file }: DocumentCommentSectionProps) {
    const commentsEndpoint = `/api/document_comments?document=/api/documents/${documentId}`;
    const [comments, setComments] = useState<DocumentCommentEntity[]>(() => {
        const preloaded = readPreloadedApi(commentsEndpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member'] ? preloaded['hydra:member'].map(convertToDocumentComment) : [];
    });
    const { request } = useApi<HydraCollection<unknown>>();
    const { t } = useTranslation();

    useEffect(() => {
        if (comments.length > 0) return;

        async function getComments() {
            const commentsData = await request('GET', commentsEndpoint);

            if (!commentsData) {
                return null;
            }

            setComments(commentsData['hydra:member'].map(convertToDocumentComment));
        }

        getComments();
    }, [comments.length, commentsEndpoint, request]);

    const handleCommentAdded = useCallback((newComment: DocumentCommentEntity) => {
        setComments(prevComments => [...prevComments, newComment]);
    }, []);

    return (
        <div className="vtk-panel p-5">
            <h2 className="m-0 mb-4 text-base font-semibold tracking-tight text-vtk-ink">
                {t('document.comments.title')}
                <span className="ml-2 text-[13px] font-normal text-vtk-muted">({comments.length})</span>
            </h2>

            <div className="space-y-3">
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
                        id={comment.id}
                        author={comment.creator?.fullName || t("document.anonymous")}
                        content={comment.content ?? ''}
                    />
                ))}
            </div>
        </div>
    );
}