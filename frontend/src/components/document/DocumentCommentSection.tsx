import AddDocumentCommentBox from "@/components/document/AddDocumentCommentBox";
import DocumentComment from "@/components/document/DocumentComment";
import { HydraCollection, readPreloadedApi, useApi } from "@/hooks/useApi";
import type { DocumentComment as DocumentCommentEntity } from "@/types/entities";
import { convertToDocumentComment } from "@/utils/convertToEntity";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import SectionHeader from "@/components/ui/SectionHeader";
import { MessagesSquare, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface DocumentCommentSectionProps {
    documentId: number;
    file?: string;
    displayInline: boolean;
}

export default function DocumentCommentSection({
    documentId,
    file,
    displayInline,
}: DocumentCommentSectionProps) {
    const commentsEndpoint = `/api/document_comments?document=/api/documents/${documentId}`;
    const [comments, setComments] = useState<DocumentCommentEntity[]>(() => {
        const preloaded = readPreloadedApi(commentsEndpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member'] ? preloaded['hydra:member'].map(convertToDocumentComment) : [];
    });
    const [isOpen, setIsOpen] = useState(false);
    const { request, loading } = useApi<HydraCollection<unknown>>();
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

    const commentsBody = (
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
    );

    if (displayInline) {
        return (
            <section aria-labelledby={`document-comments-heading-${documentId}`}>
                <SectionHeader
                    id={`document-comments-heading-${documentId}`}
                    icon={<MessagesSquare />}
                    title={t('document.comments.title')}
                    count={comments.length}
                />
                {commentsBody}
            </section>
        );
    }

    const drawerId = `document-comments-${documentId}`;
    const isLoadingCount = loading && comments.length === 0;

    // On a narrow page the comments are a button in the page header that opens a drawer.
    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-controls={drawerId}
                aria-expanded={isOpen}
                aria-label={isLoadingCount
                    ? t('document.comments.loading')
                    : t('document.comments.open', { count: comments.length })}
                title={t('document.comments.open', { count: comments.length })}
                className="vtk-button vtk-button-sm"
            >
                <MessagesSquare className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t('document.comments.title')}</span>
                <span aria-live="polite" className="text-fg-muted tabular">
                    {isLoadingCount ? '…' : comments.length}
                </span>
            </button>

            <Dialog open={isOpen} onClose={setIsOpen} className="relative z-50">
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-neutral-900/25 transition-opacity duration-200 data-closed:opacity-0"
                />
                <div className="fixed inset-y-0 right-0 flex w-full max-w-[420px]">
                    <DialogPanel
                        transition
                        id={drawerId}
                        className="h-full w-full overflow-y-auto overscroll-contain border-l border-border bg-surface shadow-dialog transition duration-200 ease-out data-closed:translate-x-full"
                    >
                        <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-5">
                            <DialogTitle className="m-0 flex items-center gap-2 text-title font-semibold text-fg">
                                {t('document.comments.title')}
                                <span className="text-body font-normal text-fg-muted tabular">{comments.length}</span>
                            </DialogTitle>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="vtk-icon-button"
                                aria-label={t('document.comments.close')}
                                title={t('document.comments.close')}
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="p-5">{commentsBody}</div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}
