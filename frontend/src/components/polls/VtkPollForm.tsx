'use client';

import { useToast } from '@/components/ui/Toast';
import { useAnswerVtkPoll, VtkPollAnswerError } from '@/hooks/useVtkPolls';
import { cn } from '@/lib/utils';
import type { VtkPoll, VtkPollQuestion } from '@/types/entities';
import { Check, LoaderCircle, Lock } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** The same cap vtk.be puts on an open answer (`MAX_OPEN_ANSWER_LENGTH`). */
const MAX_OPEN_ANSWER_LENGTH = 2000;
const SCORES = [1, 2, 3, 4, 5];

/** What the member answered so far, as the strings vtk.be takes back. */
function initialValues(poll: VtkPoll): Record<string, string> {
    const values: Record<string, string> = {};
    for (const question of poll.questions) {
        const answer = poll.answers[question.id];
        if (!answer) continue;
        if (question.kind === 'OPEN') {
            if (answer.text) values[question.id] = answer.text;
        } else if (answer.value !== null) {
            values[question.id] = String(answer.value);
        }
    }
    return values;
}

function ChoiceGroup({ labelId, options, value, onChange, disabled, wide }: {
    labelId: string;
    options: { value: string; label: string }[];
    value: string | undefined;
    onChange: (value: string) => void;
    disabled: boolean;
    wide?: boolean;
}) {
    return (
        <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
            {options.map((option) => {
                const checked = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'h-9 rounded-control border text-body font-medium transition-colors cursor-pointer disabled:cursor-default',
                            'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus',
                            wide ? 'min-w-16 px-4' : 'w-10',
                            checked
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-border-strong bg-surface text-fg hover:bg-surface-hover',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

function QuestionRow({ question, value, onChange, disabled }: {
    question: VtkPollQuestion;
    value: string | undefined;
    onChange: (value: string) => void;
    disabled: boolean;
}) {
    const { t } = useTranslation();
    const id = useId();
    const labelId = `${id}-label`;

    if (question.kind === 'OPEN') {
        return (
            <div className="grid gap-2 px-4 py-3.5">
                <label htmlFor={id} className="text-body font-medium text-fg">
                    {question.text} <span className="font-normal text-fg-muted">{t('polls.optional')}</span>
                </label>
                <textarea
                    id={id}
                    value={value ?? ''}
                    onChange={(event) => onChange(event.target.value)}
                    maxLength={MAX_OPEN_ANSWER_LENGTH}
                    placeholder={t('polls.placeholder')}
                    disabled={disabled}
                    rows={3}
                    className="vtk-textarea"
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div id={labelId} className="text-body font-medium text-fg">{question.text}</div>
            {question.kind === 'YES_NO' ? (
                <ChoiceGroup
                    labelId={labelId}
                    options={[{ value: '1', label: t('polls.yes') }, { value: '0', label: t('polls.no') }]}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    wide
                />
            ) : (
                <div className="grid shrink-0 gap-1">
                    <ChoiceGroup
                        labelId={labelId}
                        options={SCORES.map((score) => ({ value: String(score), label: String(score) }))}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                    />
                    <div className="flex justify-between text-caption text-fg-muted" aria-hidden="true">
                        <span>{question.low ?? t('polls.default_low')}</span>
                        <span>{question.high ?? t('polls.default_high')}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * One VTK poll, every question at once, as on the VTK homepage. After sending only the thanks
 * stays, with a way back in to change the answers until the poll closes. There is deliberately no
 * interim result: what others answered could colour your own.
 */
export default function VtkPollForm({ poll, compact = false }: {
    poll: VtkPoll;
    /** The homepage version: a yellow accent, and who asks and why on one line. */
    compact?: boolean;
}) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const answer = useAnswerVtkPoll();
    const [editing, setEditing] = useState(!poll.answered);
    const [values, setValues] = useState<Record<string, string>>(() => initialValues(poll));
    const [submitting, setSubmitting] = useState(false);
    const headingId = useId();

    const filled = Object.values(values).some((value) => value.trim() !== '');

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!filled) return;

        setSubmitting(true);
        try {
            // A cleared open answer is sent as empty, which vtk.be reads as skipped.
            await answer(poll.id, values);
            setEditing(false);
            showToast(t('polls.saved'), 'success');
        } catch (error) {
            const reason = error instanceof VtkPollAnswerError ? error.reason : 'failed';
            showToast(t(`polls.errors.${reason}`), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (!editing) {
        return (
            <section aria-labelledby={headingId} className="vtk-panel flex items-start gap-3 px-4 py-4">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-success-bg text-success-text">
                    <Check className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 id={headingId} className="m-0 text-body font-semibold text-fg">{t('polls.thanks_title')}</h3>
                    <p className="m-0 mt-0.5 text-small text-fg-muted">
                        {poll.title} · {poll.thanks}
                    </p>
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="mt-2 cursor-pointer text-small font-medium text-link hover:underline"
                    >
                        {t('polls.edit')}
                    </button>
                </div>
            </section>
        );
    }

    return (
        <form onSubmit={submit} aria-labelledby={headingId} className="vtk-panel overflow-hidden">
            <div className={cn('border-b border-border px-4 py-3.5', compact && 'border-t-[3px] border-t-vtk-yellow')}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 id={headingId} className="m-0 text-title font-semibold text-fg">{poll.title}</h3>
                    <span className="text-small text-fg-muted">{poll.openUntil}</span>
                </div>
                {compact ? (
                    // One line on the homepage: who asks, and why it matters.
                    <p className="m-0 mt-0.5 text-small text-fg-muted">{poll.askedBy} · {poll.lead}</p>
                ) : (
                    <>
                        <p className="m-0 mt-0.5 text-small text-fg-muted">{poll.askedBy}</p>
                        <p className="m-0 mt-2 text-body text-fg-secondary">{poll.lead}</p>
                    </>
                )}
            </div>

            <div className="divide-y divide-border">
                {poll.questions.map((question) => (
                    <QuestionRow
                        key={question.id}
                        question={question}
                        value={values[question.id]}
                        onChange={(value) => setValues((current) => ({ ...current, [question.id]: value }))}
                        disabled={submitting}
                    />
                ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 flex items-center gap-1.5 text-small text-fg-muted">
                    <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                    {poll.anonymous}
                </p>
                <button
                    type="submit"
                    disabled={submitting || !filled}
                    className="vtk-button vtk-button-primary vtk-button-sm inline-flex shrink-0 items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default disabled:opacity-50"
                >
                    {submitting && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
                    {submitting ? t('polls.submitting') : t('polls.submit')}
                </button>
            </div>
        </form>
    );
}
