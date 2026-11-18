'use client';

import { Dialog } from '@/components/ui/Dialog';
import { DialogTitle } from '@headlessui/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** The link of the exported calendar, with how to subscribe to it. */
export default function ExportDialog({
    open,
    feedPath,
    busy,
    onRotate,
    onClose,
}: {
    open: boolean;
    feedPath: string | null;
    busy: boolean;
    onRotate: () => Promise<boolean>;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);
    const [confirmRotate, setConfirmRotate] = useState(false);
    const feed = feedPath ? `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ''}${feedPath}` : '';
    const webcal = feed.replace(/^https?:/, 'webcal:');

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(feed);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // No clipboard access (plain http): select the link so it can be copied by hand.
            inputRef.current?.select();
        }
    };

    return (
        <Dialog isOpen={open} onClose={onClose} size="lg">
            <div className="text-left">
                <DialogTitle as="h2" className="m-0 pr-10 text-title-lg font-semibold text-fg">
                    {t('study_planner.export.title')}
                </DialogTitle>
                <p className="m-0 mt-2 text-body text-fg-muted">{t('study_planner.export.intro')}</p>

                <div className="mt-4 flex gap-2">
                    <input
                        ref={inputRef}
                        readOnly
                        value={feed}
                        onFocus={(e) => e.currentTarget.select()}
                        aria-label={t('study_planner.export.link_label')}
                        className="vtk-input min-w-0 flex-1 bg-surface-muted font-mono text-small"
                    />
                    <button type="button" onClick={copy} disabled={!feed} className="vtk-button shrink-0">
                        {copied ? t('study_planner.export.copied') : t('study_planner.export.copy')}
                    </button>
                </div>
                <span aria-live="polite" className="sr-only">
                    {copied ? t('study_planner.export.copied') : ''}
                </span>

                <h3 className="m-0 mt-6 text-body font-semibold text-fg">Apple Calendar</h3>
                <ol className="m-0 mt-2 list-decimal space-y-1.5 pl-5 text-body text-fg-secondary marker:text-fg-muted">
                    <li>{t('study_planner.export.apple_1')}</li>
                    <li>{t('study_planner.export.apple_2')}</li>
                    <li>{t('study_planner.export.apple_3')}</li>
                </ol>
                <p className="m-0 mt-4 text-small text-fg-muted">{t('study_planner.export.google')}</p>
                <p className="m-0 mt-2 text-small text-fg-muted">
                    {t('study_planner.export.secret')}{' '}
                    {confirmRotate ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                                if (await onRotate()) setConfirmRotate(false);
                            }}
                            onBlur={() => setConfirmRotate(false)}
                            autoFocus
                            className="font-medium text-danger-text underline underline-offset-4"
                        >
                            {t('study_planner.export.rotate_confirm')}
                        </button>
                    ) : (
                        <button type="button" onClick={() => setConfirmRotate(true)} className="vtk-link">
                            {t('study_planner.export.rotate')}
                        </button>
                    )}
                </p>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={onClose} className="vtk-button">
                        {t('study_planner.export.close')}
                    </button>
                    {webcal && (
                        <a href={webcal} className="vtk-button vtk-button-primary">
                            {t('study_planner.export.subscribe')}
                        </a>
                    )}
                </div>
            </div>
        </Dialog>
    );
}
