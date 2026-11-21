'use client';

import PageHeader from '@/components/layout/PageHeader';
import { RowsSkeleton } from '@/components/loading/LoadingPage';
import Link from '@/components/ui/Link';
import SectionHeader from '@/components/ui/SectionHeader';
import { useMarkNotificationsRead, useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types/entities';
import { examCalendarYear } from '@/utils/examPeriods';
import { Bell, ChevronRight, FileText, History, ListPlus, MessageSquareText, NotebookPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Long enough to see which rows are new before their dots fade. */
const MARK_READ_AFTER_MS = 1500;

const ICONS = {
    document: FileText,
    course_comment: MessageSquareText,
    exam: NotebookPen,
    exam_questions: ListPlus,
} as const;

function relativeTime(date: Date, locale: string, now: number): string {
    const seconds = Math.round((date.getTime() - now) / 1000);
    const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
        ['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.35], ['month', 12],
    ];
    let value = seconds;
    for (const [unit, size] of steps) {
        if (Math.abs(value) < size) {
            return unit === 'second' ? format.format(0, 'minute') : format.format(Math.round(value), unit);
        }
        value /= size;
    }
    return format.format(Math.round(value), 'year');
}

function NotificationRow({ notification, locale, now }: { notification: AppNotification; locale: string; now: number }) {
    const { t } = useTranslation();
    // The backend's `name` is already in the course's own language (see courseTitle).
    const course = notification.course.name || notification.course.code;
    const examName = notification.exam
        ? t(`exam.name.${notification.exam.period}`, { year: examCalendarYear(notification.exam.academicYear) })
        : '';

    let href = `/course/${notification.course.id}`;
    let title: string;
    let detail: string;
    switch (notification.type) {
        case 'document':
            href = notification.document ? `/document/${notification.document.id}` : href;
            title = notification.document?.name ?? t('notifications.document');
            detail = t('notifications.document_in', { course });
            break;
        case 'course_comment':
            href = `${href}#evaluation-heading`;
            title = notification.comment?.excerpt ? `“${notification.comment.excerpt}”` : t('notifications.comment');
            detail = t('notifications.comment_in', { course });
            break;
        case 'exam':
            href = notification.exam ? `${href}/exams/${notification.exam.id}` : href;
            title = examName || t('notifications.exam');
            detail = t('notifications.exam_in', { course });
            break;
        case 'exam_questions':
            href = notification.exam ? `${href}/exams/${notification.exam.id}` : href;
            title = t('notifications.questions', { count: notification.count });
            detail = examName ? `${examName} · ${course}` : course;
            break;
    }

    const Icon = ICONS[notification.type];
    const unread = !notification.read;

    return (
        <li>
            <Link href={href} className="vtk-list-row group">
                <Icon className="size-4 shrink-0 text-icon" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-medium text-fg">{title}</span>
                    <span className="truncate text-small text-fg-muted">{detail}</span>
                </span>
                {/* The server formats in its own timezone and clock; the browser's reading wins. */}
                <time
                    suppressHydrationWarning
                    dateTime={notification.updatedAt.toISOString()}
                    title={notification.updatedAt.toLocaleString(locale)}
                    className="hidden shrink-0 text-small text-fg-muted tabular sm:inline"
                >
                    {relativeTime(notification.updatedAt, locale, now)}
                </time>
                {/* Stays in the layout when read, so the row does not shift as the dot fades. */}
                <span
                    className={cn(
                        'size-2 shrink-0 rounded-full bg-vtk-yellow transition-opacity duration-700 motion-reduce:transition-none',
                        unread ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-label={unread ? t('notifications.unread_label') : undefined}
                    role={unread ? 'img' : undefined}
                />
                <ChevronRight className="size-4 shrink-0 text-fg-placeholder transition-colors group-hover:text-icon" aria-hidden="true" />
            </Link>
        </li>
    );
}

/**
 * What is new in the courses the reader follows, i.e. their favourite courses. Opening the page
 * marks everything read, after a moment so the new rows can still be told apart; they stay under
 * "Nieuw" for this visit rather than jumping down the moment they are read.
 */
export default function NotificationsPage() {
    const { t, i18n } = useTranslation();
    const feed = useNotifications();
    const markRead = useMarkNotificationsRead();

    // The rows that were unread when the page opened; they keep their section for this visit.
    const [newIds, setNewIds] = useState<Set<number> | null>(null);
    if (feed && newIds === null) {
        setNewIds(new Set(feed.items.filter((item) => !item.read).map((item) => item.id)));
    }
    // Rendered once per visit; times are relative to when the page was opened.
    const [now] = useState(() => Date.now());

    const unreadCount = feed?.unreadCount ?? 0;
    useEffect(() => {
        if (unreadCount === 0) return;
        const timer = setTimeout(() => { void markRead(); }, MARK_READ_AFTER_MS);
        return () => clearTimeout(timer);
    }, [unreadCount, markRead]);

    const fresh = feed?.items.filter((item) => newIds?.has(item.id)) ?? [];
    const earlier = feed?.items.filter((item) => !newIds?.has(item.id)) ?? [];

    const list = (items: AppNotification[]) => (
        <ul className="vtk-list m-0 list-none p-0">
            {items.map((item) => (
                <NotificationRow key={item.id} notification={item} locale={i18n.language} now={now} />
            ))}
        </ul>
    );

    return (
        <>
            <PageHeader crumbs={[{ label: t('notifications.title'), icon: <Bell /> }]} />

            <div className="vtk-shell vtk-shell-narrow">
                <h1 className="vtk-page-title">{t('notifications.title')}</h1>
                <p className="vtk-page-subtitle m-0">{t('notifications.subtitle')}</p>

                <div className="mt-6 grid gap-8">
                    {feed === null ? (
                        <RowsSkeleton rows={4} />
                    ) : feed.items.length === 0 ? (
                        <div className="vtk-panel vtk-empty">
                            <p className="m-0">{t('notifications.empty')}</p>
                            <Link href="/courses" className="vtk-link mt-2 inline-block text-small">
                                {t('notifications.browse')}
                            </Link>
                        </div>
                    ) : (
                        <>
                            {fresh.length > 0 && (
                                <section>
                                    <SectionHeader icon={<Bell />} title={t('notifications.new')} count={fresh.length} />
                                    {list(fresh)}
                                </section>
                            )}
                            {earlier.length > 0 && (
                                <section>
                                    <SectionHeader icon={<History />} title={t('notifications.earlier')} />
                                    {list(earlier)}
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
