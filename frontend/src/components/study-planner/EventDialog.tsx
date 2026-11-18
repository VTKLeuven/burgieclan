'use client';

import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import type { StudyPlannerEvent, StudyPlannerMark, StudyPlannerOperation } from '@/types/entities';
import { DialogTitle } from '@headlessui/react';
import { Check, EyeOff, Flag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { subjectName, typeKey } from './model';
import { longDay, mondayOf, weekdayName } from './time';
import type { PlannerApi } from './useStudyPlanner';

/** Details of one timetable session, with done / mandatory / hide actions. */
export default function EventDialog({
    event,
    api,
    onClose,
}: {
    event: StudyPlannerEvent | null;
    api: PlannerApi;
    onClose: () => void;
}) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    // Keep the last session on screen while the dialog fades out.
    const [shown, setShown] = useState(event);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (event) setShown(event);
    }, [event]);

    const { state, run, busy, error } = api;
    const act = (op: StudyPlannerOperation) => void run(op);
    const e = event ?? shown;
    const week = e ? mondayOf(e.date) : null;
    // Other slots of the same course in the same week (a practical offered in several groups).
    const othersShown = e
        ? state.events.filter((o) => o.uid !== e.uid && o.course === e.course && o.code === e.code && mondayOf(o.date) === week && !o.hidden).length
        : 0;
    const subject = e ? state.subjects.find((s) => s.key === e.subject) : undefined;
    const slot = e
        ? t('study_planner.event.slot', {
            weekday: weekdayName(e.date, locale),
            time: e.start,
            room: e.location ?? '',
            context: e.location ? 'room' : undefined,
        })
        : '';

    return (
        <Dialog isOpen={event !== null} onClose={onClose} size="md">
            {e && (
                <div className="text-left">
                    <p className="m-0 pr-10 text-small font-medium text-link">{t(typeKey(e.type))}</p>
                    <DialogTitle as="h2" className="m-0 mt-0.5 pr-10 text-title-lg font-semibold text-fg">
                        {e.course}
                    </DialogTitle>

                    <dl className="m-0 mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-body">
                        <dt className="text-fg-muted">{t('study_planner.event.when')}</dt>
                        <dd className="m-0 text-fg">
                            {longDay(e.date, locale)}, {e.start}
                            {e.end ? `–${e.end}` : ''}
                        </dd>
                        {e.location && (
                            <>
                                <dt className="text-fg-muted">{t('study_planner.event.where')}</dt>
                                <dd className="m-0 text-fg">{e.location}</dd>
                            </>
                        )}
                        {e.people && (
                            <>
                                <dt className="text-fg-muted">{t('study_planner.event.staff')}</dt>
                                <dd className="m-0 text-fg">{e.people}</dd>
                            </>
                        )}
                        {e.code && (
                            <>
                                <dt className="text-fg-muted">{t('study_planner.event.code')}</dt>
                                <dd className="m-0 text-fg tabular">{e.code}</dd>
                            </>
                        )}
                    </dl>
                    {e.courseId !== null && (
                        <Link href={`/course/${e.courseId}`} className="vtk-link mt-3 inline-flex text-body">
                            {t('study_planner.event.open_course', { name: subjectName(subject, locale) })}
                        </Link>
                    )}

                    <div className="mt-5 space-y-4 border-t border-border pt-5">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => act({ op: 'done', uid: e.uid, value: !e.done })}
                            aria-pressed={e.done}
                            className={cn(
                                'vtk-button',
                                e.done && 'border-success-border bg-success-bg text-success-text hover:bg-success-bg',
                            )}
                        >
                            <Check className="size-4" aria-hidden="true" />
                            {e.done ? t('study_planner.event.done_undo') : t('study_planner.event.mark_done')}
                        </button>

                        <ActionGroup
                            title={t('study_planner.event.mandatory_title')}
                            icon={<Flag className="size-4" aria-hidden="true" />}
                            state={e.mandatory}
                            stateText={
                                e.mandatory === 'event'
                                    ? t('study_planner.event.mandatory_one')
                                    : t('study_planner.event.mandatory_weekly', { slot })
                            }
                            busy={busy}
                            onOne={() => act({ op: 'mandatory', uid: e.uid, value: true })}
                            onWeekly={() => act({ op: 'addRule', uid: e.uid, action: 'mandatory' })}
                            onUndo={() =>
                                act(
                                    e.mandatory === 'rule' && e.mandatoryRule
                                        ? { op: 'removeRule', id: e.mandatoryRule }
                                        : { op: 'mandatory', uid: e.uid, value: false },
                                )
                            }
                            oneLabel={t('study_planner.event.mark_mandatory')}
                            undoLabel={e.mandatory === 'rule' ? t('study_planner.event.remove_weekly_mark') : t('study_planner.event.remove_mark')}
                        />

                        <ActionGroup
                            title={t('study_planner.event.show_title')}
                            icon={<EyeOff className="size-4" aria-hidden="true" />}
                            state={e.hidden}
                            stateText={
                                e.hidden === 'event'
                                    ? t('study_planner.event.hidden_one')
                                    : t('study_planner.event.hidden_weekly', { slot })
                            }
                            busy={busy}
                            onOne={() => act({ op: 'hide', uid: e.uid, value: true })}
                            onWeekly={() => act({ op: 'addRule', uid: e.uid, action: 'hide' })}
                            onUndo={() =>
                                act(
                                    e.hidden === 'rule' && e.hiddenRule
                                        ? { op: 'removeRule', id: e.hiddenRule }
                                        : { op: 'hide', uid: e.uid, value: false },
                                )
                            }
                            oneLabel={t('study_planner.event.hide_one')}
                            undoLabel={e.hidden === 'rule' ? t('study_planner.event.show_weekly_again') : t('study_planner.event.show_again')}
                            help={t('study_planner.event.hide_help')}
                            extra={
                                othersShown > 0 ? (
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => act({ op: 'keepOnly', uid: e.uid })}
                                        className="vtk-button vtk-button-primary h-auto min-h-9 whitespace-normal py-1.5 text-left"
                                    >
                                        {t('study_planner.event.keep_only', { count: othersShown })}
                                    </button>
                                ) : null
                            }
                        />
                    </div>

                    {error && (
                        <p role="alert" className="m-0 mt-4 text-body text-danger-text">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </Dialog>
    );
}

function ActionGroup({
    title,
    icon,
    state,
    stateText,
    busy,
    onOne,
    onWeekly,
    onUndo,
    oneLabel,
    undoLabel,
    help,
    extra,
}: {
    title: string;
    icon: ReactNode;
    state: StudyPlannerMark;
    stateText: string;
    busy: boolean;
    onOne: () => void;
    onWeekly: () => void;
    onUndo: () => void;
    oneLabel: string;
    undoLabel: string;
    help?: string;
    extra?: ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <div>
            <p className="m-0 text-small font-semibold text-fg">{title}</p>
            {state ? (
                <>
                    <p className="m-0 mt-1 text-body text-fg-secondary">{stateText}</p>
                    <button type="button" disabled={busy} onClick={onUndo} className="vtk-button mt-2">
                        {undoLabel}
                    </button>
                </>
            ) : (
                <>
                    {help && <p className="m-0 mt-0.5 text-small text-fg-muted">{help}</p>}
                    {extra && <div className="mt-2">{extra}</div>}
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={onOne} className="vtk-button">
                            {icon}
                            {oneLabel}
                        </button>
                        <button type="button" disabled={busy} onClick={onWeekly} className="vtk-button">
                            {t('study_planner.event.every_week')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
