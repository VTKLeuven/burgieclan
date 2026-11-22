'use client';

import { ReviewSummary } from '@/components/exchange/AthensPage';
import { ATHENS_TOPIC_ICONS } from '@/components/exchange/athensData';
import { athensSessionLabel, countryName, EXCHANGE_PROGRAMS, readSavedProgram } from '@/components/exchange/exchangeData';
import ExchangeShell, { useShareExperience } from '@/components/exchange/ExchangeShell';
import { MyStars, StarRow } from '@/components/exchange/Stars';
import { Bone, RowsSkeleton } from '@/components/loading/LoadingPage';
import Link from '@/components/ui/Link';
import { useAthensActions, useAthensCourse } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import { ATHENS_TOPICS, type AthensCourseDetail, type AthensReview } from '@/types/entities';
import { Check, Clock, EyeOff, History, Mail, MapPin, Plus, Trash2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function ReviewCard({ review }: { review: AthensReview }) {
    const { t } = useTranslation();
    const { remove } = useAthensActions();
    const [confirming, setConfirming] = useState(false);
    const [failed, setFailed] = useState(false);
    const topics = ATHENS_TOPICS.filter((topic) => review.sections[topic]);

    return (
        <article className="rounded-card border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                    <StarRow value={review.rating} className="mr-1" />
                    <span className="vtk-badge vtk-badge-muted h-[22px]! text-caption!">{athensSessionLabel(review.session, t)}</span>
                    <span
                        title={t(`exchange.programs.${review.program}`)}
                        className="inline-flex h-[22px] items-center rounded-[6px] border border-tag-grey-border bg-tag-grey-bg px-1.5 text-caption font-medium text-tag-grey-text"
                    >
                        {review.program}
                    </span>
                    <span className="ml-0.5 text-small text-fg-muted">{review.author ?? t(`exchange.programs.${review.program}`)}</span>
                    {review.underReview && (
                        <span className="vtk-badge h-[22px]! border-warning-border! bg-warning-bg! text-caption! text-warning-text!" title={t('exchange.athens.under_review_hint')}>
                            <Clock className="size-3" aria-hidden="true" />
                            {t('exchange.destination.under_review')}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {review.contactEmail && !review.mine && (
                        <a
                            href={`mailto:${review.contactEmail}`}
                            title={review.contactEmail}
                            className="inline-flex h-7 items-center gap-1.5 rounded-chip px-2 text-small text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                        >
                            <Mail className="size-3.5" aria-hidden="true" />
                            {t('exchange.destination.contact')}
                        </a>
                    )}
                    {review.mine && (
                        <button
                            type="button"
                            className={cn('vtk-button vtk-button-sm', confirming ? 'vtk-button-danger' : 'vtk-button-ghost')}
                            onClick={() => {
                                if (!confirming) {
                                    setConfirming(true);
                                    return;
                                }
                                setFailed(false);
                                remove(review.id).catch(() => setFailed(true)).finally(() => setConfirming(false));
                            }}
                            onBlur={() => setConfirming(false)}
                        >
                            <Trash2 className="size-4" aria-hidden="true" />
                            {confirming ? t('exchange.destination.delete_confirm') : t('exchange.destination.delete')}
                        </button>
                    )}
                </div>
            </div>
            <div className="px-4 pt-1 pb-4">
                {failed && <p role="alert" className="m-0 pt-3 text-small text-danger-text">{t('exchange.destination.delete_failed')}</p>}
                {topics.map((topic) => {
                    const Icon = ATHENS_TOPIC_ICONS[topic];
                    return (
                        <div key={topic} className="pt-3.5">
                            <h3 className="m-0 flex items-center gap-2 text-small font-semibold text-fg">
                                <Icon className="size-3.5 text-icon" aria-hidden="true" />
                                {t(`exchange.athens.topics.${topic}.name`)}
                            </h3>
                            <p className="m-0 mt-1.5 max-w-[72ch] text-body leading-[22px] whitespace-pre-line text-fg-secondary">{review.sections[topic]}</p>
                        </div>
                    );
                })}
            </div>
        </article>
    );
}

/** The thirteen programmes, the ones with a positive advice first in colour; the reader's own stands out. */
function Advice({ detail, program }: { detail: AthensCourseDetail; program: string | null }) {
    const { t } = useTranslation();
    const positive = detail.course.programs;
    const mine = program ? positive.includes(program) : null;

    return (
        <section className="mt-6" aria-labelledby="athens-advice">
            <h2 id="athens-advice" className="m-0 text-title font-semibold text-fg">{t('exchange.athens.course.advice')}</h2>
            <p className="m-0 mt-1 text-small text-fg-muted">{t('exchange.athens.course.advice_hint')}</p>
            {program && (
                <p
                    className={cn(
                        'm-0 mt-3 flex items-center gap-2 rounded-control border px-3 py-2 text-small',
                        mine ? 'border-success-border bg-success-bg text-success-text' : 'border-warning-border bg-warning-bg text-warning-text',
                    )}
                >
                    {mine ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <X className="size-4 shrink-0" aria-hidden="true" />}
                    {t(mine ? 'exchange.athens.course.advice_yes' : 'exchange.athens.course.advice_no', { program: t(`exchange.programs.${program}`) })}
                </p>
            )}
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
                {EXCHANGE_PROGRAMS.map((code) => {
                    const yes = positive.includes(code);
                    return (
                        <li
                            key={code}
                            title={`${t(`exchange.programs.${code}`)}: ${t(yes ? 'exchange.athens.course.positive' : 'exchange.athens.course.negative')}`}
                            className={cn(
                                'inline-flex h-7 items-center gap-1 rounded-chip border px-2 text-small font-medium',
                                yes ? 'border-sky-300 bg-surface-selected text-link' : 'border-border bg-surface text-fg-placeholder line-through',
                                code === program && 'ring-2 ring-primary/40',
                            )}
                        >
                            {yes ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
                            {code}
                            <span className="sr-only">{t(yes ? 'exchange.athens.course.positive' : 'exchange.athens.course.negative')}</span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function Properties({ detail }: { detail: AthensCourseDetail }) {
    const { t, i18n } = useTranslation();
    const { course, university, siblings } = detail;

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
                    {row(t('exchange.athens.course.university'), university.name)}
                    {row(t('exchange.destination.city'), `${university.city}, ${countryName(university.country, i18n.language)}`)}
                    {row(t('exchange.athens.course.code'), <span className="tabular">{course.code}</span>)}
                    {row(t('exchange.athens.course.evaluation'), course.evaluation)}
                    {row(
                        t('exchange.athens.course.catalogue'),
                        <span className="tabular">
                            {course.firstEdition === course.lastEdition ? course.lastEdition : `${course.firstEdition.slice(0, 4)} – ${course.lastEdition}`}
                        </span>,
                    )}
                </dl>
                {university.erasmusDestinationId && (
                    <Link href={`/exchange/${university.erasmusDestinationId}`} className="vtk-link mt-3 inline-block text-small">
                        {t('exchange.athens.course.erasmus', { name: university.name })}
                    </Link>
                )}
            </div>
            {siblings.length > 0 && (
                <div>
                    <h2 className="m-0 mb-1 text-caption font-medium text-fg-muted">{t('exchange.athens.course.siblings', { name: university.name })}</h2>
                    <ul className="m-0 max-h-[24rem] list-none overflow-y-auto p-0">
                        {siblings.map((other) => (
                            <li key={other.id} className="border-t border-border first:border-t-0">
                                <Link href={`/exchange/athens/${other.id}`} className="group flex items-baseline justify-between gap-3 py-2 text-small">
                                    <span className="min-w-0 font-medium text-fg group-hover:underline group-hover:decoration-border-strong group-hover:underline-offset-4">{other.title}</span>
                                    <span className="shrink-0 text-fg-muted tabular">
                                        {other.reviewCount > 0 && other.rating !== null ? `★ ${other.rating.toFixed(1)}` : '—'}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </aside>
    );
}

function CourseContent({ detail }: { detail: AthensCourseDetail }) {
    const { t, i18n } = useTranslation();
    const share = useShareExperience();
    const { course, university, reviews, elsewhere } = detail;
    const [program, setProgram] = useState<string | null>(null);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProgram(readSavedProgram());
    }, []);

    return (
        <>
            <h1 className="vtk-page-title">{course.title}</h1>
            <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-icon" aria-hidden="true" />
                    {university.name} · {university.city}, {countryName(university.country, i18n.language)}
                </span>
                <span className="vtk-badge vtk-badge-muted h-[22px]! text-caption! tabular">{course.code}</span>
                <span className="vtk-badge vtk-badge-info h-[22px]! text-caption!">{course.evaluation}</span>
            </p>

            {!course.active && (
                <p className="m-0 mt-4 flex gap-2.5 rounded-card border border-border bg-surface-muted px-4 py-3 text-small text-fg-secondary">
                    <History className="mt-0.5 size-4 shrink-0 text-icon" aria-hidden="true" />
                    {t('exchange.athens.course.inactive', { last: course.lastEdition })}
                </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border px-4 py-3">
                <div className="min-w-0">
                    <strong className="block text-body font-medium text-fg">{t('exchange.athens.stars.label')}</strong>
                    <span className="flex items-center gap-1.5 text-small text-fg-muted">
                        <EyeOff className="size-3.5 shrink-0" aria-hidden="true" />
                        {t('exchange.athens.stars.private')}
                    </span>
                </div>
                <MyStars courseId={course.id} initial={course.myStars} size="md" />
            </div>

            <div className="mt-2 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-10">
                <div className="min-w-0">
                    <Advice detail={detail} program={program} />

                    <section className="mt-8" aria-labelledby="athens-reviews">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
                            <h2 id="athens-reviews" className="m-0 flex items-center gap-3 text-title font-semibold text-fg">
                                {t('exchange.athens.course.reviews')}
                                <ReviewSummary course={course} />
                            </h2>
                            {reviews.length > 0 && (
                                <button type="button" className="vtk-button vtk-button-sm" onClick={() => share(course.id)}>
                                    <Plus className="size-4" aria-hidden="true" />
                                    {t('exchange.athens.share')}
                                </button>
                            )}
                        </div>
                        {reviews.length === 0 ? (
                            <div className="mt-4 flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-6 py-10 text-center">
                                <h3 className="m-0 text-title font-semibold text-fg">{t('exchange.athens.course.empty_title')}</h3>
                                <p className="m-0 max-w-[46ch] text-body text-fg-muted">{t('exchange.athens.course.empty_text', { city: university.city })}</p>
                                <button type="button" className="vtk-button vtk-button-primary mt-1" onClick={() => share(course.id)}>
                                    <Plus className="size-4" aria-hidden="true" />
                                    {t('exchange.athens.share')}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-4 flex flex-col gap-3.5">
                                {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
                            </div>
                        )}
                    </section>

                    {elsewhere.length > 0 && (
                        <section className="mt-10" aria-labelledby="athens-elsewhere">
                            <h2 id="athens-elsewhere" className="m-0 text-title font-semibold text-fg">{t('exchange.athens.course.elsewhere', { city: university.city })}</h2>
                            <p className="m-0 mt-1 mb-3 text-small text-fg-muted">{t('exchange.athens.course.elsewhere_hint', { name: university.name })}</p>
                            <div className="flex flex-col gap-2.5">
                                {elsewhere.map((item) => (
                                    <article key={item.reviewId} className="rounded-card border border-border px-4 py-3.5">
                                        <div className="flex flex-wrap items-center gap-1.5 text-small text-fg-muted">
                                            <Link href={`/exchange/athens/${item.course.id}`} className="vtk-link font-medium">{item.course.title}</Link>
                                            <span>· {athensSessionLabel(item.session, t)} · {item.program}</span>
                                        </div>
                                        {(['city', 'practical'] as const).filter((topic) => item.sections[topic]).map((topic) => {
                                            const Icon = ATHENS_TOPIC_ICONS[topic];
                                            return (
                                                <div key={topic} className="pt-2.5">
                                                    <h3 className="m-0 flex items-center gap-2 text-small font-semibold text-fg">
                                                        <Icon className="size-3.5 text-icon" aria-hidden="true" />
                                                        {t(`exchange.athens.topics.${topic}.name`)}
                                                    </h3>
                                                    <p className="m-0 mt-1 max-w-[72ch] text-body leading-[22px] whitespace-pre-line text-fg-secondary">{item.sections[topic]}</p>
                                                </div>
                                            );
                                        })}
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
                <div className="lg:pt-6">
                    <Properties detail={detail} />
                </div>
            </div>
        </>
    );
}

/** /exchange/athens/{id}: one ATHENS course, who it counts for, what students thought of it, and your own stars. */
export default function AthensCoursePage() {
    const { t } = useTranslation();
    const params = useParams<{ id: string }>();
    const id = params?.id && /^\d+$/.test(params.id) ? params.id : null;
    const { detail, failed } = useAthensCourse(id);

    return (
        <ExchangeShell
            crumbs={[{ label: 'ATHENS', href: '/exchange/athens' }, ...(detail ? [{ label: detail.course.title }] : [])]}
            courseId={detail?.course.id ?? (id ? Number(id) : undefined)}
        >
            {failed || !id ? (
                <div className="flex flex-col items-center gap-3 rounded-card border border-border px-6 py-10 text-center">
                    <p role="alert" className="m-0 text-body text-fg-muted">{id ? t('exchange.athens.course.load_failed') : t('exchange.athens.course.not_found')}</p>
                    <Link href="/exchange/athens" className="vtk-link text-small">{t('exchange.athens.course.back')}</Link>
                </div>
            ) : !detail ? (
                <>
                    <Bone className="h-8 w-80" />
                    <Bone className="mt-3 h-4 w-56" />
                    <RowsSkeleton rows={5} className="mt-8" />
                </>
            ) : (
                <CourseContent detail={detail} />
            )}
        </ExchangeShell>
    );
}
