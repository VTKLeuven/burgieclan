'use client'

import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog';
import { useTranslation } from 'react-i18next';

export interface SittingRemoval {
    id: string;
    label: string;
    /** How many questions are marked with this day, always at least one. */
    questions: number;
}

/**
 * Asks before removing a day that questions are marked with, since that also unmarks it on all of
 * them. Days nobody marked go without asking.
 */
export default function RemoveSittingDialog({ removal, open, onCancel, onConfirm }: {
    /** Kept while the dialog fades out, so its text does not vanish mid-animation. */
    removal: SittingRemoval | null;
    open: boolean;
    onCancel: () => void;
    onConfirm: (id: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <Dialog isOpen={open} onClose={onCancel} size="md">
            <DialogTitle className="text-lg font-semibold text-vtk-ink">
                {t('exam.sittings.remove-confirm.title', { label: removal?.label })}
            </DialogTitle>
            <DialogBody className="grid gap-2 text-sm text-vtk-body">
                <p className="m-0">
                    {removal?.questions === 1
                        ? t('exam.sittings.remove-confirm.body-one', { label: removal.label })
                        : t('exam.sittings.remove-confirm.body-other', { label: removal?.label, count: removal?.questions })}
                </p>
                <p className="vtk-help m-0">{t('exam.sittings.remove-confirm.undo')}</p>
            </DialogBody>
            <DialogActions>
                <button
                    type="button"
                    onClick={onCancel}
                    className="vtk-button vtk-button-sm vtk-button-subtle cursor-pointer"
                >
                    {t('exam.cancel')}
                </button>
                <button
                    type="button"
                    onClick={() => removal && onConfirm(removal.id)}
                    className="vtk-button vtk-button-sm vtk-button-danger cursor-pointer"
                >
                    {t('exam.sittings.remove-confirm.submit')}
                </button>
            </DialogActions>
        </Dialog>
    );
}
