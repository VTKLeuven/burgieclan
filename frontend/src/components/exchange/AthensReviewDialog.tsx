'use client';

import { athensSessionLabel, EXCHANGE_PROGRAMS, pastAthensSessions, readSavedProgram } from '@/components/exchange/exchangeData';
import { ATHENS_TOPIC_ICONS } from '@/components/exchange/athensData';
import { StarInput } from '@/components/exchange/Stars';
import { Dialog } from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { ExchangeError, useAthensActions, useAthensCourse, useAthensOverview, type AthensReviewInput } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import { ATHENS_TOPICS, type AthensTopic } from '@/types/entities';
import { DialogTitle } from '@headlessui/react';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

/** "Schrijf een review": one review of one ATHENS course, with a score and any of the topics. */
export default function AthensReviewDialog({
    open,
    initialCourseId,
    onClose,
}: {
    open: boolean;
    initialCourseId?: number;
    onClose: () => void;
}) {
    // A fresh form each time it opens; the dialog keeps the last one on screen while it fades out.
    const [opened, setOpened] = useState(0);
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setOpened((count) => count + 1);
    }

    return (
        <Dialog isOpen={open} onClose={onClose} size="2xl">
            {opened > 0 && <ReviewForm key={opened} initialCourseId={initialCourseId} onClose={onClose} />}
        </Dialog>
    );
}

function ReviewForm({ initialCourseId, onClose }: { initialCourseId?: number; onClose: () => void }) {
    const { t, i18n } = useTranslation();
    const id = useId();
    const router = useRouter();
    const { showToast } = useToast();
    const { share } = useAthensActions();
    const { overview } = useAthensOverview();
    // A course no longer in the catalogue is not in the overview, but can still be reviewed from its page.
    const { detail } = useAthensCourse(initialCourseId ? String(initialCourseId) : null);
    const sessions = useMemo(() => pastAthensSessions(), []);

    const [courseId, setCourseId] = useState(initialCourseId ? String(initialCourseId) : '');
    const [session, setSession] = useState(sessions[0] ?? '');
    const [program, setProgram] = useState(() => readSavedProgram() ?? '');
    const [rating, setRating] = useState<number | null>(null);
    const [sections, setSections] = useState<Partial<Record<AthensTopic, string>>>({});
    const [openTopic, setOpenTopic] = useState<AthensTopic | null>('course');
    const [contactable, setContactable] = useState(true);
    const [showName, setShowName] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const courseOptions = useMemo(() => {
        const universities = new Map((overview?.universities ?? []).map((university) => [university.id, university]));
        const options = (overview?.courses ?? []).map((course) => ({
            value: String(course.id),
            label: `${course.title} · ${course.code}`,
            group: universities.get(course.universityId)?.name ?? '',
            keywords: universities.get(course.universityId)?.city,
        }));
        if (detail && !options.some((option) => option.value === String(detail.course.id))) {
            options.push({ value: String(detail.course.id), label: `${detail.course.title} · ${detail.course.code}`, group: detail.university.name, keywords: detail.university.city });
        }
        return options.sort((a, b) => a.group.localeCompare(b.group, i18n.language) || a.label.localeCompare(b.label, i18n.language));
    }, [overview, detail, i18n.language]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);

        const filled = Object.fromEntries(Object.entries(sections).filter(([, text]) => text?.trim()));
        if (!courseId) return setError(t('exchange.athens.form.errors.course'));
        if (!program) return setError(t('exchange.form.errors.program'));
        if (!rating) return setError(t('exchange.athens.form.errors.rating'));
        if (Object.keys(filled).length === 0) return setError(t('exchange.athens.form.errors.empty'));

        const input: AthensReviewInput = { courseId: Number(courseId), session, program, rating, sections: filled, contactable, showName };
        setBusy(true);
        try {
            const created = await share(input);
            showToast(t('exchange.athens.form.sent'), 'success');
            onClose();
            router.push(`/exchange/athens/${created.courseId}`);
        } catch (caught) {
            const status = caught instanceof ExchangeError ? caught.status : 0;
            const detailText = caught instanceof ExchangeError ? caught.detail : '';
            setError(status === 429 ? t('exchange.athens.form.errors.rate') : t('exchange.form.errors.failed', { detail: detailText }));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} noValidate>
            <DialogTitle as="h2" className="m-0 pr-10 text-title-lg font-semibold text-fg">{t('exchange.athens.form.title')}</DialogTitle>
            <p className="m-0 mt-1 text-small text-fg-muted">{t('exchange.athens.form.intro')}</p>

            <div className="mt-5 grid gap-5">
                <div className="vtk-field">
                    <label htmlFor={`${id}-course`} className="vtk-field-label">{t('exchange.athens.form.course')}</label>
                    <Select
                        id={`${id}-course`}
                        value={courseId}
                        onChange={setCourseId}
                        placeholder={t('exchange.athens.form.choose_course')}
                        options={courseOptions}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="vtk-field col-span-2 sm:col-span-1">
                        <label htmlFor={`${id}-program`} className="vtk-field-label">{t('exchange.form.program')}</label>
                        <Select
                            id={`${id}-program`}
                            value={program}
                            onChange={setProgram}
                            placeholder={t('exchange.form.program')}
                            options={EXCHANGE_PROGRAMS.map((code) => ({ value: code, label: `${code} · ${t(`exchange.programs.${code}`)}` }))}
                        />
                    </div>
                    <div className="vtk-field col-span-2 sm:col-span-1">
                        <label htmlFor={`${id}-session`} className="vtk-field-label">{t('exchange.athens.form.session')}</label>
                        <Select id={`${id}-session`} value={session} onChange={setSession} options={sessions.map((value) => ({ value, label: athensSessionLabel(value, t) }))} />
                    </div>
                </div>

                <div className="vtk-field">
                    <span className="vtk-field-label" id={`${id}-rating`}>{t('exchange.athens.form.rating')}</span>
                    <div className="flex items-center gap-3">
                        <StarInput value={rating} onChange={setRating} label={t('exchange.athens.form.rating')} />
                        {rating && <span className="text-small text-fg-muted">{t(`exchange.athens.form.rating_words.${rating}`)}</span>}
                    </div>
                </div>

                <div className="grid gap-2">
                    <span className="vtk-field-label">{t('exchange.form.topics')}</span>
                    <div className="overflow-hidden rounded-card border border-border">
                        {ATHENS_TOPICS.map((topic, index) => {
                            const Icon = ATHENS_TOPIC_ICONS[topic];
                            const isOpen = openTopic === topic;
                            const filled = Boolean(sections[topic]?.trim());
                            return (
                                <div key={topic} className={cn(index > 0 && 'border-t border-border')}>
                                    <button
                                        type="button"
                                        aria-expanded={isOpen}
                                        onClick={() => setOpenTopic(isOpen ? null : topic)}
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-hover"
                                    >
                                        <Icon className="size-4 shrink-0 text-icon" aria-hidden="true" />
                                        <span className="text-body font-medium text-fg">{t(`exchange.athens.topics.${topic}.name`)}</span>
                                        <span className="min-w-0 flex-1 truncate text-small text-fg-muted">{t(`exchange.athens.topics.${topic}.prompt`)}</span>
                                        {filled && <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />}
                                        <ChevronRight className={cn('size-4 shrink-0 text-fg-placeholder transition-transform', isOpen && 'rotate-90')} aria-hidden="true" />
                                    </button>
                                    {isOpen && (
                                        <div className="px-3.5 pb-3.5">
                                            <textarea
                                                aria-label={t(`exchange.athens.topics.${topic}.name`)}
                                                className="vtk-textarea"
                                                rows={4}
                                                maxLength={3000}
                                                autoFocus
                                                placeholder={`${t(`exchange.athens.topics.${topic}.prompt`)}…`}
                                                value={sections[topic] ?? ''}
                                                onChange={(event) => setSections({ ...sections, [topic]: event.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-3">
                    <label className="flex items-start justify-between gap-4">
                        <span>
                            <span className="block text-body font-medium text-fg">{t('exchange.form.contactable')}</span>
                            <span className="block text-small text-fg-muted">{t('exchange.athens.form.contactable_hint')}</span>
                        </span>
                        <Switch checked={contactable} onCheckedChange={setContactable} className="mt-0.5" />
                    </label>
                    <label className="flex items-start justify-between gap-4">
                        <span>
                            <span className="block text-body font-medium text-fg">{t('exchange.form.show_name')}</span>
                            <span className="block text-small text-fg-muted">{t('exchange.athens.form.show_name_hint')}</span>
                        </span>
                        <Switch checked={showName} onCheckedChange={setShowName} className="mt-0.5" />
                    </label>
                </div>

                {error && <p role="alert" className="m-0 rounded-control border border-danger-border bg-danger-bg px-3 py-2 text-small text-danger-text">{error}</p>}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" className="vtk-button" onClick={onClose}>{t('exchange.form.cancel')}</button>
                    <button type="submit" className="vtk-button vtk-button-primary" disabled={busy}>
                        {busy ? t('exchange.form.submitting') : t('exchange.form.submit')}
                    </button>
                </div>
            </div>
        </form>
    );
}
