import PDFViewer from "@/components/document/pdf/PDFViewer";
import Editor from "@/components/editor/Editor";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/useApi";
import type { DocumentComment } from "@/types/entities";
import { convertToDocumentComment } from "@/utils/convertToEntity";
import { Editor as TiptapEditor } from '@tiptap/react';
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

//TODO: Rethink if this modal is really necessary or if we can just use the editor directly

interface AddDocumentCommentModalProps {
    documentId: number;
    file?: string;
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
    onCommentAdded?: (newComment: DocumentComment) => void;
}

export default function AddDocumentCommentModal({ documentId, file, isModalOpen, setIsModalOpen, onCommentAdded }: AddDocumentCommentModalProps) {
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);
    const [isAnonymous, setIsAnonymous] = useState<boolean>(false); // TODO get default from user, BUR-222
    const { t } = useTranslation();
    const { request, loading } = useApi();
    const { showToast } = useToast();

    async function onSubmit(htmlContent: string, anonymous: boolean) {
        const res = await request('POST', '/api/document_comments', {
            content: htmlContent,
            anonymous: anonymous,
            document: `/api/documents/${documentId}`,
        });

        if (!res) {
            showToast(t('document.comments.error'), 'error');
            return;
        }

        showToast(t('document.comments.success'), 'success');
        setIsModalOpen(false);

        // Convert the response to a DocumentComment and notify parent
        if (onCommentAdded) {
            const newComment = convertToDocumentComment(res);
            onCommentAdded(newComment);
        }
    }

    // Update container width on mount and window resize
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);

        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const handleEditorReady = (editor: TiptapEditor) => {
        setEditorInstance(editor);
    };

    return (
        <Dialog
            size="6xl"
            className="flex flex-col max-h-[80vh] w-full max-w-4xl"
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
        >
            {file &&
                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto p-4 mt-5"
                >
                    <PDFViewer
                        file={file}
                        width={containerWidth}
                    />
                </div>
            }
            <div className="border-t border-gray-200 mt-2">
                <Editor
                    parentDialogOpen={isModalOpen}
                    onEditorReady={handleEditorReady}
                />
            </div>

            <div className="col-span-full mt-4 gap-3 pb-2 px-10">
                <Checkbox
                    label={t('document.comments.anonymous')}
                    disabled={loading}
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className="justify-end"
                />
            </div>

            <DialogActions className="mt-0!">
                <button
                    onClick={() => {
                        if (editorInstance && onSubmit) {
                            const htmlContent = editorInstance.getHTML();
                            onSubmit(htmlContent, isAnonymous);
                        }
                    }}
                    disabled={loading}
                    className="primary-button inline-flex items-center"
                >
                    {loading ? (
                        <>
                            <span className="spinner mr-2" />
                            {t('document.comments.submitting')}
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 w-5 h-5" />
                            {t('document.comments.submit')}
                        </>
                    )}
                </button>
            </DialogActions>
        </Dialog>
    );
}