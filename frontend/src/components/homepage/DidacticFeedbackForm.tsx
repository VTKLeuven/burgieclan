'use client';

import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { CheckCircle2, Mail, MessageSquarePlus, Send } from 'lucide-react';
import { useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
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
            <div className="rounded-card border border-success-border bg-success-bg px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    <div>
                        <h3 className="m-0 text-body font-semibold text-fg">{t('home.feedback_success_title')}</h3>
                        <p className="m-0 mt-1 text-small text-fg-secondary">
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
        <section aria-labelledby="didactic-feedback-heading">
            <SectionHeader
                id="didactic-feedback-heading"
                icon={<MessageSquarePlus />}
                title={t('home.feedback_title')}
                description={t('home.feedback_description')}
            />

            <form onSubmit={handleSubmit} className="rounded-card border border-border bg-surface p-3">
                <div className="mb-2">
                    <label htmlFor="feedback-type" className="sr-only">
                        {t('home.feedback_type_label')}
                    </label>
                    <select
                        id="feedback-type"
                        value={type}
                        onChange={(e) => setType(e.target.value as FeedbackType)}
                        disabled={isSubmitting}
                        className="vtk-select h-8 text-small"
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
                    className="vtk-textarea min-h-20 text-small"
                    rows={2.5}
                    maxLength={MAX_LENGTH}
                    required
                    disabled={isSubmitting}
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <a
                        href={mailtoHref}
                        className="inline-flex items-center gap-1 text-caption text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
                    >
                        <Mail className="size-3" aria-hidden="true" />
                        {t('home.feedback_mail')}
                    </a>

                    <div className="ml-auto flex items-center gap-2">
                        {showLengthHint && (
                            <p className="m-0 text-caption text-fg-muted">{t('faq.ask_hint')}</p>
                        )}
                        <button type="submit" disabled={!canSubmit} className="vtk-button vtk-button-sm">
                            {isSubmitting ? (
                                <>
                                    <span className="spinner" />
                                    {t('faq.ask_submitting')}
                                </>
                            ) : (
                                <>
                                    <Send className="size-3.5" aria-hidden="true" />
                                    {t('home.feedback_button')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
}
