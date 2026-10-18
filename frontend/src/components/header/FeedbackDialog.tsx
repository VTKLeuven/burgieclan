'use client'

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import type { User } from '@/types/entities';

/** Where Dopl runs; only messages from here are read. */
const DOPL_ORIGIN = 'https://dopl.vtk.be';
/** The public form "Burgieclan Feedback" in Dopl, where IT tracks its work. */
const DOPL_FEEDBACK_FORM = `${DOPL_ORIGIN}/f/burgieclan-burgieclan-feedback`;

/**
 * The form with what we already know: the page language (`?lang=nl`, Dopl is
 * English otherwise) and the signed-in user's email and name, which Dopl shows
 * as one "sending as" line that can still be changed (Dopl D-142). With
 * `embedOrigin` it is the form as Dopl's own `embed.js` loads it in a modal.
 */
export function doplFeedbackUrl(user: User | null, language: string, embedOrigin?: string): string {
    const params = new URLSearchParams();
    if (embedOrigin) {
        params.set('embed', 'modal');
        params.set('origin', embedOrigin);
    }
    if (language === 'nl') params.set('lang', 'nl');
    if (user?.email) params.set('email', user.email);
    if (user?.fullName) params.set('name', user.fullName);
    const query = params.toString();
    return query ? `${DOPL_FEEDBACK_FORM}?${query}` : DOPL_FEEDBACK_FORM;
}

/**
 * "Feedback Nieuwe Burgieclan" from the header: Dopl's intake form in a modal
 * instead of a new tab, the same way vtk.be shows its website feedback.
 *
 * Deliberately not Dopl's `embed.js`, which puts a floating button on every
 * page and loads an external script for everyone. The iframe speaks the same
 * protocol: `?embed=modal`, and the messages `dopl:resize` and `dopl:close`,
 * accepted only from Dopl and only from this iframe. Dopl's form has its own
 * title and close button, so the panel is only a frame.
 */
export default function FeedbackDialog({
    open,
    onClose,
    user,
}: {
    open: boolean;
    onClose: () => void;
    user: User | null;
}) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose} className="relative z-[60]">
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-vtk-ink/35 backdrop-blur-xs transition-opacity duration-200 data-closed:opacity-0"
            />
            <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
                <DialogPanel
                    transition
                    className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-vtk-line bg-vtk-surface shadow-[0_18px_48px_rgba(10,15,31,0.18)] transition duration-200 data-closed:scale-95 data-closed:opacity-0"
                >
                    <DialogTitle className="sr-only">{t('header.new_burgieclan_feedback')}</DialogTitle>
                    {/* Mounted only while open: Dopl loads on the click, and a
                        second opening starts from an empty form. */}
                    {open && <FeedbackFrame user={user} onClose={onClose} />}
                </DialogPanel>
            </div>
        </Dialog>
    );
}

function FeedbackFrame({ user, onClose }: { user: User | null; onClose: () => void }) {
    const { t, i18n } = useTranslation();
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [src] = useState(() => doplFeedbackUrl(user, i18n.language, window.location.origin));
    const [height, setHeight] = useState<number | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Any window can post messages; "close" or "grow to 9000 px" only
        // counts from Dopl, and only from this iframe.
        function onMessage(event: MessageEvent) {
            if (event.origin !== DOPL_ORIGIN || event.source !== frameRef.current?.contentWindow) return;
            const data = (event.data ?? {}) as { type?: unknown; height?: unknown };
            if (data.type === 'dopl:close') onClose();
            if (data.type === 'dopl:resize' && typeof data.height === 'number') {
                setHeight(Math.ceil(data.height));
            }
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [onClose]);

    return (
        <>
            <div className="relative min-h-[420px]">
                {!loaded && (
                    <p role="status" className="absolute inset-0 grid place-items-center text-sm text-vtk-muted">
                        {t('header.feedback_loading')}
                    </p>
                )}
                <iframe
                    ref={frameRef}
                    src={src}
                    title={t('header.new_burgieclan_feedback')}
                    className="block w-full border-0"
                    style={{ height: height ?? 560, visibility: loaded ? 'visible' : 'hidden' }}
                    onLoad={() => {
                        setLoaded(true);
                        frameRef.current?.focus();
                    }}
                />
            </div>
            <p className="flex items-center justify-end gap-3 border-t border-vtk-line px-4 py-2 text-xs text-vtk-muted">
                <a
                    href={doplFeedbackUrl(user, i18n.language)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:text-vtk-ink hover:underline"
                >
                    {t('header.feedback_open_in_tab')}
                </a>
                <span aria-hidden="true">·</span>
                {/* Also when Dopl does not load, and its own close button is not there. */}
                <button type="button" onClick={onClose} className="underline-offset-2 hover:text-vtk-ink hover:underline">
                    {t('header.feedback_close')}
                </button>
            </p>
        </>
    );
}
