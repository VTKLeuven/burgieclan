'use client';

import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { CheckCircle2, Mail, MessageSquarePlus, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;
const ONDERWIJS_EMAIL = 'onderwijs@vtk.be';

export type FeedbackType = 'course_issue' | 'exam_feedback' | 'general_faq' | 'other';

export function DidacticFeedbackForm() {
    const { request } = useApi();
    const { showToast } = useToast();
    const { t, i18n } = useTranslation();

    const [question, setQuestion] = useState('');
    const [type, setType] = useState<FeedbackType>('course_issue');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const trimmed = question.trim();
    const canSubmit = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH && !isSubmitting;
    const showLengthHint = trimmed.length > 0 && trimmed.length < MIN_LENGTH;

    const mailtoHref = `mailto:${ONDERWIJS_EMAIL}?subject=${encodeURIComponent(t('home.feedback_mail_subject'))}`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setIsSubmitting(true);
        try {
            const res = await request('POST', '/api/faq_questions', {
                question: trimmed,
                locale: i18n.language,
                type,
            });

            if (!res) {
                showToast(t('home.feedback_error'), 'error');
                return;
            }

            setIsSubmitted(true);
            setQuestion('');
            showToast(t('home.feedback_success'), 'success');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="vtk-panel vtk-panel-muted px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-vtk-ink" aria-hidden="true" />
                    <div>
                        <h3 className="text-sm font-semibold text-vtk-ink">{t('home.feedback_success_title')}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-vtk-body">
                            {t('home.feedback_success_description')}
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsSubmitted(false)}
                            className="vtk-button vtk-button-sm vtk-button-ghost mt-2"
                        >
                            {t('home.feedback_another')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="vtk-panel vtk-panel-muted px-4 py-3.5">
            <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-vtk-ink shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-vtk-ink">{t('home.feedback_title')}</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-vtk-muted">{t('home.feedback_description')}</p>

            <form onSubmit={handleSubmit} className="mt-2.5">
                <div className="mb-2">
                    <label htmlFor="feedback-type" className="sr-only">
                        {t('home.feedback_type_label')}
                    </label>
                    <select
                        id="feedback-type"
                        value={type}
                        onChange={(e) => setType(e.target.value as FeedbackType)}
                        disabled={isSubmitting}
                        className="vtk-input text-xs py-1 px-2 bg-vtk-surface text-vtk-ink border border-vtk-line"
                    >
                        <option value="course_issue">{t('home.feedback_type_course_issue')}</option>
                        <option value="exam_feedback">{t('home.feedback_type_exam')}</option>
                        <option value="general_faq">{t('home.feedback_type_general')}</option>
                        <option value="other">{t('home.feedback_type_other')}</option>
                    </select>
                </div>

                <label htmlFor="didactic-feedback" className="sr-only">
                    {t('home.feedback_label')}
                </label>
                <textarea
                    id="didactic-feedback"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t('home.feedback_placeholder')}
                    className="vtk-textarea min-h-16 text-xs p-2"
                    rows={2.5}
                    maxLength={MAX_LENGTH}
                    required
                    disabled={isSubmitting}
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <a
                        href={mailtoHref}
                        className="inline-flex items-center gap-1 text-[11px] text-vtk-muted underline-offset-2 transition-colors hover:text-vtk-ink hover:underline"
                    >
                        <Mail className="h-3 w-3" aria-hidden="true" />
                        {t('home.feedback_mail')}
                    </a>

                    <div className="ml-auto flex items-center gap-2">
                        {showLengthHint && (
                            <p className="text-[11px] text-vtk-muted">{t('faq.ask_hint')}</p>
                        )}
                        <button type="submit" disabled={!canSubmit} className="vtk-button vtk-button-sm vtk-button-accent">
                            {isSubmitting ? (
                                <>
                                    <span className="spinner" />
                                    {t('faq.ask_submitting')}
                                </>
                            ) : (
                                <>
                                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                    {t('home.feedback_button')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
