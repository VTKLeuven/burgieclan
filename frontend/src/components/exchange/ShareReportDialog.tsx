'use client';

import { COUNTRY_CODES, countryName, EXCHANGE_PROGRAMS, readSavedProgram, recentAcademicYears, TOPIC_ICONS } from '@/components/exchange/exchangeData';
import { Dialog } from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { ExchangeError, useExchangeActions, useExchangeOverview, type ExchangeReportInput } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import { EXCHANGE_TOPICS, type ExchangeCourse, type ExchangeTopic } from '@/types/entities';
import { DialogTitle } from '@headlessui/react';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

const emptyCourse = (): ExchangeCourse => ({ name: '', code: '', equivalent: '', text: '' });

/** "Deel je ervaring": one report about one destination, with any of the topics and courses. */
export default function ShareReportDialog({
    open,
    initialDestinationId,
    onClose,
}: {
    open: boolean;
    initialDestinationId?: number;
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
            {opened > 0 && <ShareForm key={opened} initialDestinationId={initialDestinationId} onClose={onClose} />}
        </Dialog>
    );
}

function ShareForm({ initialDestinationId, onClose }: { initialDestinationId?: number; onClose: () => void }) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const id = useId();
    const router = useRouter();
    const { showToast } = useToast();
    const { share } = useExchangeActions();
    const { overview } = useExchangeOverview();
    const years = useMemo(() => recentAcademicYears(), []);

    const [destinationId, setDestinationId] = useState(initialDestinationId ? String(initialDestinationId) : '');
    const [adding, setAdding] = useState(false);
    const [newDestination, setNewDestination] = useState({ name: '', city: '', country: '' });
    const [program, setProgram] = useState(() => readSavedProgram() ?? '');
    // Last academic year: most reports are written after coming back.
    const [academicYear, setAcademicYear] = useState(years[2] ?? years[0]);
    const [phase, setPhase] = useState('M1');
    const [period, setPeriod] = useState('S1');
    const [sections, setSections] = useState<Partial<Record<ExchangeTopic, string>>>({});
    const [openTopic, setOpenTopic] = useState<ExchangeTopic | null>('general');
    const [courses, setCourses] = useState<ExchangeCourse[]>([emptyCourse()]);
    const [contactable, setContactable] = useState(true);
    const [showName, setShowName] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // The destinations under their country, countries in the reader's language.
    const destinationOptions = useMemo(
        () => (overview?.destinations ?? [])
            .map((destination) => ({
                value: String(destination.id),
                label: `${destination.name} · ${destination.city}`,
                group: countryName(destination.country, locale),
            }))
            .sort((a, b) => a.group.localeCompare(b.group, locale) || a.label.localeCompare(b.label, locale)),
        [overview, locale],
    );

    const countries = useMemo(
        () => COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale)),
        [locale],
    );

    const updateCourse = (index: number, field: keyof ExchangeCourse, value: string) =>
        setCourses((current) => current.map((course, i) => (i === index ? { ...course, [field]: value } : course)));

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);

        const filledCourses = courses.filter((course) => course.name.trim() !== '');
        const filledSections = Object.fromEntries(Object.entries(sections).filter(([, text]) => text?.trim()));
        if (adding ? !newDestination.name.trim() || !newDestination.city.trim() || !newDestination.country : !destinationId) {
            setError(t('exchange.form.errors.destination'));
            return;
        }
        if (Object.keys(filledSections).length === 0 && filledCourses.length === 0) {
            setError(t('exchange.form.errors.empty'));
            return;
        }
        if (!program) {
            setError(t('exchange.form.errors.program'));
            return;
        }

        const input: ExchangeReportInput = {
            ...(adding ? { newDestination } : { destinationId: Number(destinationId) }),
            academicYear,
            phase,
            period,
            program,
            sections: filledSections,
            courses: filledCourses,
            contactable,
            showName,
        };

        setBusy(true);
        try {
            const created = await share(input);
            showToast(t('exchange.form.sent'), 'success');
            onClose();
            router.push(`/exchange/${created.destinationId}`);
        } catch (caught) {
            const status = caught instanceof ExchangeError ? caught.status : 0;
            const detail = caught instanceof ExchangeError ? caught.detail : '';
            setError(status === 429 ? t('exchange.form.errors.rate') : t('exchange.form.errors.failed', { detail }));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} noValidate>
            <DialogTitle as="h2" className="m-0 pr-10 text-title-lg font-semibold text-fg">{t('exchange.form.title')}</DialogTitle>
            <p className="m-0 mt-1 text-small text-fg-muted">{t('exchange.form.intro')}</p>

            <div className="mt-5 grid gap-5">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="vtk-field sm:col-span-2">
                        <label htmlFor={`${id}-destination`} className="vtk-field-label">{t('exchange.form.destination')}</label>
                        {!adding && (
                            <Select
                                id={`${id}-destination`}
                                value={destinationId}
                                onChange={setDestinationId}
                                placeholder={t('exchange.form.choose_destination')}
                                options={destinationOptions}
                            />
                        )}
                        <label className="flex items-center gap-2 text-small text-fg-secondary">
                            <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={adding} onChange={(event) => setAdding(event.target.checked)} />
                            {t('exchange.form.other_destination')}
                        </label>
                    </div>
                    {adding && (
                        <>
                            <div className="vtk-field sm:col-span-2">
                                <label htmlFor={`${id}-name`} className="vtk-field-label">{t('exchange.form.new_name')}</label>
                                <input id={`${id}-name`} className="vtk-input" maxLength={160} value={newDestination.name} onChange={(event) => setNewDestination({ ...newDestination, name: event.target.value })} />
                            </div>
                            <div className="vtk-field">
                                <label htmlFor={`${id}-city`} className="vtk-field-label">{t('exchange.form.new_city')}</label>
                                <input id={`${id}-city`} className="vtk-input" maxLength={100} value={newDestination.city} onChange={(event) => setNewDestination({ ...newDestination, city: event.target.value })} />
                            </div>
                            <div className="vtk-field">
                                <label htmlFor={`${id}-country`} className="vtk-field-label">{t('exchange.form.new_country')}</label>
                                <Select
                                    id={`${id}-country`}
                                    value={newDestination.country}
                                    onChange={(country) => setNewDestination({ ...newDestination, country })}
                                    placeholder={t('exchange.form.choose_country')}
                                    options={countries.map((country) => ({ value: country.code, label: country.name, keywords: country.code }))}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="vtk-field col-span-2">
                        <label htmlFor={`${id}-program`} className="vtk-field-label">{t('exchange.form.program')}</label>
                        <Select
                            id={`${id}-program`}
                            value={program}
                            onChange={setProgram}
                            placeholder={t('exchange.form.program')}
                            options={EXCHANGE_PROGRAMS.map((code) => ({ value: code, label: `${code} · ${t(`exchange.programs.${code}`)}` }))}
                        />
                    </div>
                    <div className="vtk-field">
                        <label htmlFor={`${id}-year`} className="vtk-field-label">{t('exchange.form.year')}</label>
                        <Select id={`${id}-year`} value={academicYear} onChange={setAcademicYear} options={years.map((year) => ({ value: year, label: year }))} />
                    </div>
                    <div className="vtk-field">
                        <label htmlFor={`${id}-phase`} className="vtk-field-label">{t('exchange.form.phase')}</label>
                        <Select id={`${id}-phase`} value={phase} onChange={setPhase} options={[{ value: 'M1', label: 'M1' }, { value: 'M2', label: 'M2' }]} />
                    </div>
                    <div className="vtk-field col-span-2 sm:col-span-4">
                        <span className="vtk-field-label" id={`${id}-period`}>{t('exchange.form.period')}</span>
                        <div className="vtk-tabs self-start" role="group" aria-labelledby={`${id}-period`}>
                            {(['S1', 'S2', 'J'] as const).map((value) => (
                                <button key={value} type="button" className={cn('vtk-tab', period === value && 'is-active')} aria-pressed={period === value} onClick={() => setPeriod(value)}>
                                    {t(`exchange.period_long.${value}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-2">
                    <span className="vtk-field-label">{t('exchange.form.topics')}</span>
                    <div className="overflow-hidden rounded-card border border-border">
                        {EXCHANGE_TOPICS.map((topic, index) => {
                            const Icon = TOPIC_ICONS[topic];
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
                                        <span className="text-body font-medium text-fg">{t(`exchange.topics.${topic}.name`)}</span>
                                        <span className="min-w-0 flex-1 truncate text-small text-fg-muted">{t(`exchange.topics.${topic}.prompt`)}</span>
                                        {filled && <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />}
                                        <ChevronRight className={cn('size-4 shrink-0 text-fg-placeholder transition-transform', isOpen && 'rotate-90')} aria-hidden="true" />
                                    </button>
                                    {isOpen && (
                                        <div className="px-3.5 pb-3.5">
                                            <textarea
                                                aria-label={t(`exchange.topics.${topic}.name`)}
                                                className="vtk-textarea"
                                                rows={4}
                                                maxLength={6000}
                                                autoFocus
                                                placeholder={`${t(`exchange.topics.${topic}.prompt`)}…`}
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

                <div className="grid gap-2">
                    <div>
                        <span className="vtk-field-label">{t('exchange.form.courses')}</span>
                        <p className="vtk-help m-0">{t('exchange.form.courses_hint')}</p>
                    </div>
                    {courses.map((course, index) => (
                        <div key={index} className="grid gap-2 rounded-card border border-border p-3 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto]">
                            <input aria-label={t('exchange.form.course_name')} placeholder={t('exchange.form.course_name')} className="vtk-input" maxLength={200} value={course.name} onChange={(event) => updateCourse(index, 'name', event.target.value)} />
                            <input aria-label={t('exchange.form.course_code')} placeholder={t('exchange.form.course_code')} className="vtk-input" maxLength={40} value={course.code} onChange={(event) => updateCourse(index, 'code', event.target.value)} />
                            <input aria-label={t('exchange.form.course_equivalent')} placeholder={t('exchange.form.course_equivalent')} className="vtk-input" maxLength={200} value={course.equivalent} onChange={(event) => updateCourse(index, 'equivalent', event.target.value)} />
                            <button
                                type="button"
                                className="vtk-icon-button self-center justify-self-end"
                                aria-label={t('exchange.form.remove_course')}
                                title={t('exchange.form.remove_course')}
                                onClick={() => setCourses((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : [emptyCourse()]))}
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                            <textarea aria-label={t('exchange.form.course_text')} placeholder={t('exchange.form.course_text')} className="vtk-textarea min-h-16! sm:col-span-4" rows={2} maxLength={2000} value={course.text} onChange={(event) => updateCourse(index, 'text', event.target.value)} />
                        </div>
                    ))}
                    {courses.length < 20 && (
                        <button type="button" className="vtk-button vtk-button-ghost vtk-button-sm self-start" onClick={() => setCourses([...courses, emptyCourse()])}>
                            <Plus className="size-4" aria-hidden="true" />
                            {t('exchange.form.add_course')}
                        </button>
                    )}
                </div>

                <div className="grid gap-3">
                    <label className="flex items-start justify-between gap-4">
                        <span>
                            <span className="block text-body font-medium text-fg">{t('exchange.form.contactable')}</span>
                            <span className="block text-small text-fg-muted">{t('exchange.form.contactable_hint')}</span>
                        </span>
                        <Switch checked={contactable} onCheckedChange={setContactable} className="mt-0.5" />
                    </label>
                    <label className="flex items-start justify-between gap-4">
                        <span>
                            <span className="block text-body font-medium text-fg">{t('exchange.form.show_name')}</span>
                            <span className="block text-small text-fg-muted">{t('exchange.form.show_name_hint')}</span>
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
