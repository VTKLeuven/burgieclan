import AddDocumentCommentBox from "@/components/document/AddDocumentCommentBox";
import DocumentComment from "@/components/document/DocumentComment";
import { HydraCollection, readPreloadedApi, useApi } from "@/hooks/useApi";
import type { DocumentComment as DocumentCommentEntity } from "@/types/entities";
import { convertToDocumentComment } from "@/utils/convertToEntity";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { MessageSquarePlus, X } from "lucide-react";
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
            <aside className="vtk-panel p-5">
                <h2 className="m-0 mb-4 text-base font-semibold tracking-tight text-vtk-ink">
                    {t('document.comments.title')}
                    <span className="ml-2 text-[13px] font-normal text-vtk-muted">({comments.length})</span>
                </h2>
                {commentsBody}
            </aside>
        );
    }

    const drawerId = `document-comments-${documentId}`;
    const isLoadingCount = loading && comments.length === 0;

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
                className="fixed right-0 top-1/2 z-[8] flex w-12 -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-vtk-line-2 bg-vtk-navy px-2 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(10,15,31,0.22)] transition-all hover:w-14 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-yellow"
            >
                <MessageSquarePlus className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="rotate-180 leading-none tracking-wide [writing-mode:vertical-rl]">
                    {t('document.comments.title')}
                </span>
                <span
                    aria-live="polite"
                    className={`grid min-h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold ${comments.length > 0
                        ? 'bg-vtk-yellow text-vtk-ink'
                        : 'bg-white/15 text-white'
                        }`}
                >
                    {isLoadingCount ? '…' : comments.length}
                </span>
            </button>

            <Dialog open={isOpen} onClose={setIsOpen} className="relative z-[9]">
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-vtk-ink/35 backdrop-blur-xs transition-opacity duration-200 data-closed:opacity-0"
                />
                <div className="fixed bottom-0 right-0 top-[72px] flex w-full max-w-[420px]">
                    <DialogPanel
                        transition
                        id={drawerId}
                        className="h-full w-full overflow-y-auto overscroll-contain border-l border-vtk-line bg-vtk-surface p-5 shadow-[-18px_0_48px_rgba(10,15,31,0.16)] transition duration-300 ease-out data-closed:translate-x-full"
                    >
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <DialogTitle className="m-0 text-lg font-semibold tracking-tight text-vtk-ink">
                                {t('document.comments.title')}
                                <span className="ml-2 text-[13px] font-normal text-vtk-muted">
                                    ({comments.length})
                                </span>
                            </DialogTitle>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="vtk-icon-button h-9 w-9 shrink-0"
                                aria-label={t('document.comments.close')}
                                title={t('document.comments.close')}
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                        {commentsBody}
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}
