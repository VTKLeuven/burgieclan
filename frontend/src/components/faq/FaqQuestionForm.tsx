'use client';

import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { CheckCircle2, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Mirrors the Assert\Length on FaqQuestionApi::$question, so the backend never has to reject. */
const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

const CONTACT_EMAIL = 'burgieclan@vtk.be';

/**
 * Sends a question to the admin FAQ inbox. Replaces the mailto: link that used to sit here — the
 * question lands in EasyAdmin, where it can be promoted into a published FAQ item. The mail route
 * stays available as a fallback, for anything too long or too personal to type into a public form.
 */
export default function FaqQuestionForm() {
    const { request } = useApi();
    const { showToast } = useToast();
    const { t, i18n } = useTranslation();

    const [question, setQuestion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const trimmed = question.trim();
    const canSubmit = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH && !isSubmitting;
    // Only nag once they have started typing; an untouched field explains itself.
    const showLengthHint = trimmed.length > 0 && trimmed.length < MIN_LENGTH;

    const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('faq.ask_mail_subject'))}`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setIsSubmitting(true);
        try {
            const res = await request('POST', '/api/faq_questions', {
                question: trimmed,
                locale: i18n.language,
            });

            if (!res) {
                showToast(t('faq.ask_error'), 'error');
                return;
            }

            setIsSubmitted(true);
            setQuestion('');
            showToast(t('faq.ask_success'), 'success');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="vtk-panel vtk-panel-muted px-6 py-5">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-vtk-ink" aria-hidden="true" />
                    <div>
                        <h2 className="text-lg font-semibold text-vtk-ink">{t('faq.ask_success_title')}</h2>
                        <p className="mt-1.5 text-[14px] leading-relaxed text-vtk-body">
                            {t('faq.ask_success_description')}
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsSubmitted(false)}
                            className="vtk-button vtk-button-sm vtk-button-ghost mt-3"
                        >
                            {t('faq.ask_another')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="vtk-panel vtk-panel-muted px-6 py-5">
            <h2 className="text-lg font-semibold text-vtk-ink">{t('faq.ask_title')}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-vtk-body">{t('faq.ask_description')}</p>

            <form onSubmit={handleSubmit} className="mt-3.5">
                <label htmlFor="faq-question" className="sr-only">
                    {t('faq.ask_label')}
                </label>
                <textarea
                    id="faq-question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t('faq.ask_placeholder')}
                    className="vtk-textarea min-h-20"
                    rows={3}
                    maxLength={MAX_LENGTH}
                    required
                    disabled={isSubmitting}
                />

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    {/* Mail fallback sits opposite the submit button so both routes read as equals. */}
                    <a
                        href={mailtoHref}
                        className="inline-flex items-center gap-1.5 text-xs text-vtk-muted underline-offset-2 transition-colors hover:text-vtk-ink hover:underline"
                    >
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('faq.ask_mail')}
                    </a>

                    <div className="ml-auto flex items-center gap-3">
                        {showLengthHint && (
                            <p className="text-xs text-vtk-muted">{t('faq.ask_hint')}</p>
                        )}
                        <button type="submit" disabled={!canSubmit} className="vtk-button vtk-button-accent">
                            {isSubmitting ? (
                                <>
                                    <span className="spinner" />
                                    {t('faq.ask_submitting')}
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" aria-hidden="true" />
                                    {t('faq.ask_button')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
