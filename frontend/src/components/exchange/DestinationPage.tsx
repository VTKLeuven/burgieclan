'use client';

import { ProgramChip, SchemeBadge } from '@/components/exchange/ErasmusPage';
import { countryName, readSavedProgram, shortYear, TOPIC_ICONS } from '@/components/exchange/exchangeData';
import ExchangeShell, { useShareExperience } from '@/components/exchange/ExchangeShell';
import SuggestProgramsDialog from '@/components/exchange/SuggestProgramsDialog';
import { Bone, RowsSkeleton } from '@/components/loading/LoadingPage';
import Link from '@/components/ui/Link';
import { useExchangeActions, useExchangeDestination } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import { EXCHANGE_TOPICS, type ExchangeCourse, type ExchangeDestinationDetail, type ExchangeReport, type ExchangeTopic } from '@/types/entities';
import { ArrowLeftRight, Clock, ExternalLink, History, Mail, MapPin, Plus, ThumbsUp, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type View = 'topics' | 'courses' | 'reports';

/** A report's text with its web addresses as links (the old wiki pointed to Google Docs and the like). */
function RichText({ text }: { text: string }) {
    const parts = text.split(/(https?:\/\/[^\s)]+)/g);
    return (
        <>
            {parts.map((part, index) => (index % 2 === 1 ? (
                <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow" className="vtk-link break-all">{part}</a>
            ) : part))}
        </>
    );
}

/** Year, phase and semester, and programme of a report: what the wiki wrote as [24-25 · M1S1 · CW]. */
function ReportTags({ report, children }: { report: ExchangeReport; children?: ReactNode }) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {report.academicYear && <span className="vtk-badge vtk-badge-muted h-[22px]! text-caption! tabular">{shortYear(report.academicYear)}</span>}
            {report.phase && (
                <span className="vtk-badge vtk-badge-info h-[22px]! text-caption!">
                    {report.phase}{report.period && <> · {t(`exchange.period.${report.period}`)}</>}
                </span>
            )}
            {report.program && <ProgramChip code={report.program} />}
            <span className="ml-0.5 text-small text-fg-muted">{report.author ?? (report.program ? t(`exchange.programs.${report.program}`) : '')}</span>
            {report.underReview && (
                <span className="vtk-badge h-[22px]! border-warning-border! bg-warning-bg! text-caption! text-warning-text!" title={t('exchange.destination.under_review_hint')}>
                    <Clock className="size-3" aria-hidden="true" />
                    {t('exchange.destination.under_review')}
                </span>
            )}
            {children}
        </div>
    );
}

/** "Nuttig" on one part of a report; counts optimistically, and not on your own report. */
function HelpfulButton({ report, part }: { report: ExchangeReport; part: string }) {
    const { t } = useTranslation();
    const { markHelpful } = useExchangeActions();
    const [mine, setMine] = useState(report.myHelpful.includes(part));
    const base = (report.helpful[part] ?? 0) - (report.myHelpful.includes(part) ? 1 : 0);
    const count = base + (mine ? 1 : 0);

    if (report.mine || report.underReview) {
        return count > 0 ? (
            <span className="inline-flex h-7 items-center gap-1.5 px-2 text-small text-fg-muted tabular">
                <ThumbsUp className="size-3.5" aria-hidden="true" />{count}
            </span>
        ) : null;
    }

    return (
        <button
            type="button"
            aria-pressed={mine}
            aria-label={t('exchange.destination.helpful_label')}
            onClick={() => {
                const next = !mine;
                setMine(next);
                markHelpful(report.id, part, next).catch(() => setMine(!next));
            }}
            className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-chip px-2 text-small tabular transition-colors',
                mine ? 'bg-surface-selected text-link' : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
            )}
        >
            <ThumbsUp className="size-3.5" aria-hidden="true" />
            {t('exchange.destination.helpful')}{count > 0 && <> · {count}</>}
        </button>
    );
}

function ContactLink({ report }: { report: ExchangeReport }) {
    const { t } = useTranslation();
    if (!report.contactEmail || report.mine) return null;
    return (
        <a
            href={`mailto:${report.contactEmail}`}
            title={report.contactEmail}
            className="inline-flex h-7 items-center gap-1.5 rounded-chip px-2 text-small text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
            <Mail className="size-3.5" aria-hidden="true" />
            {t('exchange.destination.contact')}
        </a>
    );
}

function CourseCard({ course, report, index }: { course: ExchangeCourse; report: ExchangeReport; index: number }) {
    const { t } = useTranslation();
    return (
        <article className="overflow-hidden rounded-card border border-border">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-border bg-surface-muted px-4 py-3">
                <div className="min-w-0">
                    <strong className="block text-body font-medium text-fg">{course.name}</strong>
                    {course.code && <span className="text-caption text-fg-muted tabular">{course.code}</span>}
                </div>
                {course.equivalent && (
                    <span className="inline-flex items-center gap-1.5 text-small text-fg-muted">
                        <ArrowLeftRight className="size-3.5 shrink-0" aria-hidden="true" />
                        {t('exchange.destination.recognised_as')} <span className="font-medium text-fg">{course.equivalent}</span>
                    </span>
                )}
            </div>
            <div className="px-4 py-3">
                <ReportTags report={report} />
                {course.text && <p className="m-0 mt-2.5 max-w-[72ch] text-body leading-[22px] text-fg-secondary">{course.text}</p>}
                <div className="mt-2 -ml-2 flex gap-1">
                    <HelpfulButton report={report} part={`course-${index}`} />
                </div>
            </div>
        </article>
    );
}

function TopicsView({ detail }: { detail: ExchangeDestinationDetail }) {
    const { t } = useTranslation();
    const share = useShareExperience();
    const { reports, destination } = detail;
    const courses = reports.flatMap((report) => report.courses.map((course, index) => ({ course, report, index })));
    const count = (topic: ExchangeTopic) => reports.filter((report) => report.sections[topic]).length + (topic === 'education' ? courses.length : 0);

    // A link from "Laatst gedeeld" lands on its topic once the topics are drawn.
    useEffect(() => {
        const target = window.location.hash.slice(1);
        if (target.startsWith('topic-')) document.getElementById(target)?.scrollIntoView({ block: 'start' });
    }, []);

    return (
        <>
            <nav aria-label={t('exchange.destination.by_topic')} className="flex flex-wrap gap-1.5">
                {EXCHANGE_TOPICS.map((topic) => {
                    const Icon = TOPIC_ICONS[topic];
                    const n = count(topic);
                    return (
                        <a
                            key={topic}
                            href={`#topic-${topic}`}
                            className={cn(
                                'inline-flex h-7 items-center gap-1.5 rounded-chip border border-border px-2.5 text-small font-medium transition-colors hover:border-border-strong hover:bg-surface-hover',
                                n > 0 ? 'text-fg-secondary' : 'text-fg-placeholder',
                            )}
                        >
                            <Icon className="size-3.5" aria-hidden="true" />
                            {t(`exchange.topics.${topic}.name`)}
                            <span className="font-normal text-fg-muted tabular">{n}</span>
                        </a>
                    );
                })}
            </nav>

            {EXCHANGE_TOPICS.map((topic) => {
                const Icon = TOPIC_ICONS[topic];
                const entries = reports.filter((report) => report.sections[topic]);
                const topicCourses = topic === 'education' ? courses : [];
                return (
                    <section key={topic} id={`topic-${topic}`} className="scroll-mt-20 pt-7" aria-labelledby={`topic-${topic}-title`}>
                        <div className="flex items-center gap-2.5">
                            <span className="grid size-7 place-items-center rounded-chip border border-border bg-surface-muted text-icon">
                                <Icon className="size-4" aria-hidden="true" />
                            </span>
                            <h2 id={`topic-${topic}-title`} className="m-0 text-title font-semibold text-fg">{t(`exchange.topics.${topic}.name`)}</h2>
                        </div>
                        <p className="m-0 mt-1 mb-3 text-small text-fg-muted sm:ml-[38px]">{t(`exchange.topics.${topic}.prompt`)}</p>

                        <div className="flex flex-col gap-2.5 sm:ml-[38px]">
                            {entries.map((report) => (
                                <article key={report.id} className="rounded-card border border-border px-4 py-3.5">
                                    <ReportTags report={report} />
                                    <p className="m-0 mt-2.5 max-w-[72ch] text-body leading-[22px] whitespace-pre-line text-fg-secondary"><RichText text={report.sections[topic] ?? ''} /></p>
                                    <div className="mt-2 -ml-2 flex flex-wrap gap-1">
                                        <HelpfulButton report={report} part={topic} />
                                        <ContactLink report={report} />
                                    </div>
                                </article>
                            ))}
                            {topicCourses.map(({ course, report, index }) => (
                                <CourseCard key={`${report.id}-${index}`} course={course} report={report} index={index} />
                            ))}
                            {entries.length === 0 && topicCourses.length === 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border-strong px-4 py-3 text-small text-fg-muted">
                                    {t('exchange.destination.topic_empty')}
                                    <button type="button" className="vtk-button vtk-button-sm" onClick={() => share(destination.id)}>
                                        <Plus className="size-4" aria-hidden="true" />
                                        {t('exchange.destination.fill_in')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                );
            })}
        </>
    );
}

function CoursesView({ detail }: { detail: ExchangeDestinationDetail }) {
    const { t } = useTranslation();
    const share = useShareExperience();
    const courses = detail.reports.flatMap((report) => report.courses.map((course) => ({ course, report })));

    if (courses.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-6 py-10 text-center">
                <p className="m-0 text-body text-fg-muted">{t('exchange.destination.courses_empty')}</p>
                <button type="button" className="vtk-button vtk-button-sm" onClick={() => share(detail.destination.id)}>
                    <Plus className="size-4" aria-hidden="true" />
                    {t('exchange.form.add_course')}
                </button>
            </div>
        );
    }

    return (
        <>
            <p className="m-0 mb-3 max-w-[68ch] text-small text-fg-muted">{t('exchange.destination.courses_intro')}</p>
            <div className="vtk-table-wrap">
                <table className="vtk-table min-w-[40rem]">
                    <thead>
                        <tr>
                            <th>{t('exchange.destination.course_host')}</th>
                            <th>{t('exchange.destination.course_equivalent')}</th>
                            <th>{t('exchange.destination.course_who')}</th>
                            <th>{t('exchange.destination.course_opinion')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.map(({ course, report }, index) => (
                            <tr key={index}>
                                <td className="align-top">
                                    <strong className="block font-medium text-fg">{course.name}</strong>
                                    {course.code && <span className="text-caption text-fg-muted tabular">{course.code}</span>}
                                </td>
                                <td className="align-top">{course.equivalent || '—'}</td>
                                <td className="align-top whitespace-nowrap tabular">{[shortYear(report.academicYear), `${report.phase}${report.period}`, report.program].filter(Boolean).join(' · ')}</td>
                                <td className="align-top text-fg-secondary">{course.text || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function ReportsView({ detail }: { detail: ExchangeDestinationDetail }) {
    const { t } = useTranslation();
    const { remove } = useExchangeActions();
    const [confirming, setConfirming] = useState<number | null>(null);
    const [failed, setFailed] = useState(false);

    return (
        <div className="flex flex-col gap-3.5">
            {failed && <p role="alert" className="m-0 text-small text-danger-text">{t('exchange.destination.delete_failed')}</p>}
            {detail.reports.map((report) => {
                const topics = EXCHANGE_TOPICS.filter((topic) => report.sections[topic]);
                return (
                    <article key={report.id} className="rounded-card border border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-4 py-3">
                            <ReportTags report={report} />
                            <div className="flex items-center gap-1">
                                {report.contactEmail && !report.mine && (
                                    <span className="mr-1 hidden items-center gap-1.5 text-small text-fg-muted sm:inline-flex">
                                        <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                                        {t('exchange.destination.contactable')}
                                    </span>
                                )}
                                <ContactLink report={report} />
                                {report.mine && (
                                    <button
                                        type="button"
                                        className={cn('vtk-button vtk-button-sm', confirming === report.id ? 'vtk-button-danger' : 'vtk-button-ghost')}
                                        onClick={() => {
                                            if (confirming !== report.id) {
                                                setConfirming(report.id);
                                                return;
                                            }
                                            setFailed(false);
                                            remove(report.id).catch(() => setFailed(true)).finally(() => setConfirming(null));
                                        }}
                                        onBlur={() => setConfirming((current) => (current === report.id ? null : current))}
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                        {confirming === report.id ? t('exchange.destination.delete_confirm') : t('exchange.destination.delete')}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="px-4 pt-1 pb-4">
                            {topics.map((topic) => {
                                const Icon = TOPIC_ICONS[topic];
                                return (
                                    <div key={topic} className="pt-3.5">
                                        <h3 className="m-0 flex items-center gap-2 text-small font-semibold text-fg">
                                            <Icon className="size-3.5 text-icon" aria-hidden="true" />
                                            {t(`exchange.topics.${topic}.name`)}
                                        </h3>
                                        <p className="m-0 mt-1.5 max-w-[72ch] text-body leading-[22px] whitespace-pre-line text-fg-secondary"><RichText text={report.sections[topic] ?? ''} /></p>
                                    </div>
                                );
                            })}
                            {report.courses.length > 0 && (
                                <div className="pt-3.5">
                                    <h3 className="m-0 flex items-center gap-2 text-small font-semibold text-fg">
                                        <ArrowLeftRight className="size-3.5 text-icon" aria-hidden="true" />
                                        {t('exchange.destination.courses')}
                                    </h3>
                                    <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0 text-body text-fg-secondary">
                                        {report.courses.map((course, index) => (
                                            <li key={index}>
                                                <span className="font-medium text-fg">{course.name}</span>
                                                {course.equivalent && <> → {course.equivalent}</>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

function Properties({ detail }: { detail: ExchangeDestinationDetail }) {
    const { t, i18n } = useTranslation();
    const { destination, reports, nearby, pendingSuggestions } = detail;
    const [suggesting, setSuggesting] = useState(false);
    const contacts = reports.filter((report) => report.contactEmail && !report.mine && !report.underReview);
    const approved = reports.filter((report) => !report.underReview);
    const years = approved.map((report) => report.academicYear).sort();
    const country = countryName(destination.country, i18n.language);
    const [program, setProgram] = useState<string | null>(null);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProgram(readSavedProgram());
    }, []);

    const row = (label: string, value: ReactNode) => (
        <>
            <dt className="text-fg-muted">{label}</dt>
            <dd className="m-0 min-w-0 text-fg">{value}</dd>
        </>
    );

    return (
        <aside className="flex flex-col gap-6 rounded-card border border-border p-4 lg:sticky lg:top-[72px] lg:rounded-none lg:border-0 lg:p-0">
            <div>
                <h2 className="m-0 mb-2.5 text-caption font-medium text-fg-muted">{t('exchange.destination.properties')}</h2>
                <dl className="m-0 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-small">
                    {row(t('exchange.destination.country'), country)}
                    {row(t('exchange.destination.city'), destination.city)}
                    {row(t('exchange.destination.scheme'), t(`exchange.scheme.${destination.scheme}`))}
                    {row(
                        t('exchange.destination.programs'),
                        <span className="flex flex-col items-start gap-1.5">
                            {destination.allPrograms
                                ? t('exchange.overview.all_programs')
                                : destination.programs.length === 0
                                    ? <span className="text-fg-muted">{t('exchange.destination.programs_unknown')}</span>
                                    : <span className="flex flex-wrap gap-1">{destination.programs.map((code) => <ProgramChip key={code} code={code} highlight={code === program} />)}</span>}
                            {pendingSuggestions.length > 0 && (
                                <span className="text-caption text-fg-muted">
                                    {t('exchange.suggest.pending', {
                                        changes: pendingSuggestions.map((s) => `${s.action === 'add' ? '+' : '−'}${s.program}`).join(', '),
                                    })}
                                </span>
                            )}
                            <button type="button" className="vtk-link text-caption" onClick={() => setSuggesting(true)}>
                                {t('exchange.destination.programs_wrong')}
                            </button>
                        </span>,
                    )}
                    {row(
                        t('exchange.destination.reports_label'),
                        <span className="tabular">
                            {approved.length > 0
                                ? `${approved.length} · ${shortYear(years[0])}${years.length > 1 ? ` – ${shortYear(years[years.length - 1])}` : ''}`
                                : t('exchange.destination.reports_none')}
                        </span>,
                    )}
                    {destination.website && row(
                        t('exchange.destination.website'),
                        <a href={destination.website} target="_blank" rel="noopener noreferrer" className="vtk-link inline-flex items-center gap-1 break-all">
                            {destination.website.replace(/^https?:\/\/(www\d?\.)?/, '').replace(/\/$/, '')}
                            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                        </a>,
                    )}
                </dl>
            </div>
            {contacts.length > 0 && (
                <div>
                    <h2 className="m-0 mb-1 text-caption font-medium text-fg-muted">{t('exchange.destination.contacts')}</h2>
                    <ul className="m-0 list-none p-0">
                        {contacts.map((report) => (
                            <li key={report.id} className="flex items-center justify-between gap-3 border-t border-border py-2 text-small first:border-t-0">
                                <span className="min-w-0">
                                    <span className="block truncate font-medium text-fg">{report.author ?? t(`exchange.programs.${report.program}`)}</span>
                                    <span className="text-caption text-fg-muted tabular">
                                        {[shortYear(report.academicYear), report.phase, report.program].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                <a href={`mailto:${report.contactEmail}`} title={report.contactEmail ?? undefined} className="vtk-icon-button shrink-0" aria-label={t('exchange.destination.contact')}>
                                    <Mail className="size-4" aria-hidden="true" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {nearby.length > 0 && (
                <div>
                    <h2 className="m-0 mb-1 text-caption font-medium text-fg-muted">{t('exchange.destination.nearby', { country })}</h2>
                    <ul className="m-0 list-none p-0">
                        {nearby.map((other) => (
                            <li key={other.id} className="border-t border-border first:border-t-0">
                                <Link href={`/exchange/${other.id}`} className="group flex justify-between gap-3 py-2 text-small">
                                    <span className="min-w-0 truncate font-medium text-fg group-hover:underline group-hover:decoration-border-strong group-hover:underline-offset-4">{other.name}</span>
                                    <span className="shrink-0 text-fg-muted tabular">
                                        {other.reportCount > 0 ? t('exchange.overview.reports', { count: other.reportCount }) : '—'}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <SuggestProgramsDialog destination={destination} open={suggesting} onClose={() => setSuggesting(false)} />
        </aside>
    );
}

function DestinationContent({ detail }: { detail: ExchangeDestinationDetail }) {
    const { t, i18n } = useTranslation();
    const share = useShareExperience();
    const { destination, reports } = detail;
    const [view, setView] = useState<View>('topics');
    const hasText = reports.some((report) => Object.keys(report.sections).length > 0 || report.courses.length > 0);
    const courseCount = reports.reduce((total, report) => total + report.courses.length, 0);
    const views: [View, number | null][] = [['topics', null], ['courses', courseCount], ['reports', reports.length]];

    return (
        <>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="vtk-page-title">{destination.name}</h1>
                    <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body text-fg-muted">
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-4 text-icon" aria-hidden="true" />
                            {destination.city}, {countryName(destination.country, i18n.language)}
                        </span>
                        <SchemeBadge scheme={destination.scheme} />
                    </p>
                </div>
            </div>

            {!destination.approved && (
                <p className="m-0 mt-4 rounded-card border border-warning-border bg-warning-bg px-4 py-3 text-small text-warning-text">{t('exchange.destination.unapproved')}</p>
            )}
            {destination.source === 'wiki' && (
                <p className="m-0 mt-4 flex gap-2.5 rounded-card border border-border bg-surface-muted px-4 py-3 text-small text-fg-secondary">
                    <History className="mt-0.5 size-4 shrink-0 text-icon" aria-hidden="true" />
                    {t('exchange.destination.wiki_hint')}
                </p>
            )}

            {hasText && (
                <div role="tablist" aria-label={destination.name} className="mt-6 flex items-center gap-5 border-b border-border">
                    {views.map(([key, count]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={view === key}
                            onClick={() => setView(key)}
                            className={cn(
                                'relative -mb-px inline-flex h-10 items-center gap-1.5 border-b-2 text-body font-medium whitespace-nowrap transition-colors',
                                view === key ? 'border-primary text-primary-text' : 'border-transparent text-fg-muted hover:text-fg',
                            )}
                        >
                            {t(`exchange.destination.${key === 'topics' ? 'by_topic' : key}`)}
                            {count !== null && <span className="text-small font-normal text-fg-muted tabular">{count}</span>}
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-10">
                <div className="min-w-0">
                    {!hasText ? (
                        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-6 py-10 text-center">
                            <h2 className="m-0 text-title font-semibold text-fg">{t('exchange.destination.empty_title', { name: destination.name })}</h2>
                            <p className="m-0 max-w-[46ch] text-body text-fg-muted">{t('exchange.destination.empty_text', { city: destination.city })}</p>
                            <button type="button" className="vtk-button vtk-button-primary mt-1" onClick={() => share(destination.id)}>
                                <Plus className="size-4" aria-hidden="true" />
                                {t('exchange.share')}
                            </button>
                        </div>
                    ) : view === 'courses' ? (
                        <CoursesView detail={detail} />
                    ) : view === 'reports' ? (
                        <ReportsView detail={detail} />
                    ) : (
                        <TopicsView detail={detail} />
                    )}
                </div>
                <div>
                    <Properties detail={detail} />
                </div>
            </div>
        </>
    );
}

/** /exchange/{id}: one destination with what everyone wrote about it, by topic, course or report. */
export default function DestinationPage() {
    const { t } = useTranslation();
    const params = useParams<{ id: string }>();
    const id = params?.id && /^\d+$/.test(params.id) ? params.id : null;
    const { detail, failed } = useExchangeDestination(id);

    return (
        <ExchangeShell crumbs={detail ? [{ label: detail.destination.name }] : []} destinationId={detail?.destination.id}>
            {failed || !id ? (
                <div className="flex flex-col items-center gap-3 rounded-card border border-border px-6 py-10 text-center">
                    <p role="alert" className="m-0 text-body text-fg-muted">{id ? t('exchange.destination.load_failed') : t('exchange.destination.not_found')}</p>
                    <Link href="/exchange" className="vtk-link text-small">{t('exchange.destination.back')}</Link>
                </div>
            ) : !detail ? (
                <>
                    <Bone className="h-8 w-72" />
                    <Bone className="mt-3 h-4 w-48" />
                    <RowsSkeleton rows={5} className="mt-8" />
                </>
            ) : (
                <DestinationContent detail={detail} />
            )}
        </ExchangeShell>
    );
}
