'use client';

import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/useApi';
import { CheckCircle2, Mail, MessageSquarePlus, Send } from 'lucide-react';
import { useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import { useTranslation } from 'react-i18next';

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;
const ONDERWIJS_EMAIL = 'onderwijs@vtk.be';

export type FeedbackType = 'course_issue' | 'exam_feedback' | 'general_faq' | 'other';

const TYPES: { value: FeedbackType; label: string }[] = [
    { value: 'course_issue', label: 'home.feedback_chip_course' },
    { value: 'exam_feedback', label: 'home.feedback_chip_exam' },
    { value: 'general_faq', label: 'home.feedback_chip_general' },
    { value: 'other', label: 'home.feedback_chip_other' },
];

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

    return (
        <section aria-labelledby="didactic-feedback-heading">
            <SectionHeader
                id="didactic-feedback-heading"
                icon={<MessageSquarePlus />}
                title={t('home.feedback_title')}
                description={t('home.feedback_description')}
            />

            {/* After sending, the section keeps its heading and says what happens next. */}
            {isSubmitted ? (
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
            ) : (
                <>
                    {/* One block, like the comment boxes elsewhere: the category as chips, the text
                        field without a frame of its own, and the send button in a footer bar. */}
                    <form
                        onSubmit={handleSubmit}
                        className="overflow-hidden rounded-card border border-border-raised bg-surface-raised transition-[border-color,box-shadow] focus-within:border-border-strong focus-within:shadow-xs"
                    >
                        <div role="radiogroup" aria-label={t('home.feedback_type_label')} className="flex flex-wrap gap-1.5 px-3 pt-3">
                            {TYPES.map(({ value, label }) => {
                                const selected = type === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => setType(value)}
                                        disabled={isSubmitting}
                                        className={cn(
                                            'inline-flex h-7 items-center rounded-full border px-2.5 text-caption font-medium transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-hidden',
                                            selected
                                                ? 'border-primary bg-primary text-on-primary'
                                                : 'border-border bg-surface text-fg-secondary hover:border-border-strong hover:text-fg dark:border-transparent dark:bg-surface-hover dark:hover:border-transparent dark:hover:bg-neutral-300',
                                        )}
                                    >
                                        {t(label)}
                                    </button>
                                );
                            })}
                        </div>

                        <label htmlFor="didactic-feedback" className="sr-only">
                            {t('home.feedback_label')}
                        </label>
                        <textarea
                            id="didactic-feedback"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder={t('home.feedback_placeholder')}
                            className="block min-h-24 w-full resize-none border-0 bg-transparent px-3 pt-2.5 pb-3 text-small leading-[20px] text-fg placeholder:text-fg-placeholder focus:outline-hidden"
                            rows={3}
                            maxLength={MAX_LENGTH}
                            required
                            disabled={isSubmitting}
                        />

                        <div className="flex items-center justify-end gap-3 border-t border-border-raised bg-surface-muted px-3 py-2">
                            {showLengthHint && (
                                <p className="m-0 mr-auto text-caption text-fg-muted">{t('faq.ask_hint')}</p>
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
                    </form>

                    <p className="m-0 mt-2 flex items-center gap-1.5 text-caption text-fg-muted">
                        <Mail className="size-3.5 shrink-0 text-icon" aria-hidden="true" />
                        {t('home.feedback_mail_prefix')}
                        <a href={mailtoHref} className="font-medium text-link underline-offset-2 hover:underline">
                            {ONDERWIJS_EMAIL}
                        </a>
                    </p>
                </>
            )}
        </section>
    );
}
