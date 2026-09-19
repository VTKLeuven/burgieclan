'use client';

import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog';
import Tooltip from '@/components/ui/Tooltip';
import { useDeleteDocument } from '@/hooks/useDeleteDocument';
import { LoaderCircle, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type DeleteDocumentButtonProps = {
    documentId: number;
    /** Shown in the confirmation so the reader can tell which upload they are discarding. */
    documentName?: string;
    /** `button` for a labelled control, `icon` for the compact one on a document card. */
    variant?: 'button' | 'icon';
    /** Called once the backend has accepted the deletion. */
    onDeleted?: () => void;
};

/**
 * Withdraws an upload that is still waiting on moderation. Only render it when the backend
 * says `canDelete`; the Delete endpoint enforces the same rule, so a stale flag fails safely
 * with an error toast rather than removing anything.
 */
export default function DeleteDocumentButton({
    documentId,
    documentName,
    variant = 'button',
    onDeleted,
}: DeleteDocumentButtonProps) {
    const { t } = useTranslation();
    const deleteDocument = useDeleteDocument();
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await deleteDocument(documentId);
            setIsConfirming(false);
            onDeleted?.();
        } catch {
            // The hook has already reported this with an error toast. Keep the dialog open so
            // the reader can see nothing happened and try again.
        } finally {
            setIsDeleting(false);
        }
    };

    const label = t('document.delete.action');

    return (
        <>
            {variant === 'icon' ? (
                <Tooltip content={label}>
                    <button
                        type="button"
                        onClick={() => setIsConfirming(true)}
                        aria-label={label}
                        className="vtk-badge vtk-badge-danger flex items-center justify-center p-1 transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
                    >
                        <Trash2 size={13} aria-hidden="true" />
                    </button>
                </Tooltip>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsConfirming(true)}
                    className="vtk-button vtk-button-sm vtk-badge-danger inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                    <Trash2 size={14} aria-hidden="true" />
                    {label}
                </button>
            )}

            <Dialog
                isOpen={isConfirming}
                onClose={() => {
                    if (!isDeleting) setIsConfirming(false);
                }}
                size="md"
            >
                <DialogTitle className="text-lg font-semibold text-vtk-ink">
                    {t('document.delete.confirm.title')}
                </DialogTitle>
                <DialogBody className="text-sm text-vtk-body">
                    <p>
                        {documentName
                            ? t('document.delete.confirm.description-named', { name: documentName })
                            : t('document.delete.confirm.description')}
                    </p>
                </DialogBody>
                <DialogActions>
                    <button
                        type="button"
                        onClick={() => setIsConfirming(false)}
                        disabled={isDeleting}
                        className="vtk-button vtk-button-sm vtk-button-subtle cursor-pointer"
                    >
                        {t('document.delete.confirm.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="vtk-button vtk-button-sm vtk-button-danger inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        {isDeleting && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />}
                        {t('document.delete.confirm.submit')}
                    </button>
                </DialogActions>
            </Dialog>
        </>
    );
}
