'use client';

import SectionHeader from '@/components/ui/SectionHeader';
import { cn } from '@/lib/utils';
import type { StudyPlannerItem } from '@/types/entities';
import { Check, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ItemForm from './ItemForm';
import { groupEntries, plannerEntries, subjectName, typeKey, type Entry } from './model';
import { dayDistance, daysBetween, weekdayName } from './time';
import type { PlannerApi } from './useStudyPlanner';

/**
 * Deadlines and mandatory sessions over all courses: the ones entered by hand, and the timetable
 * sessions marked as mandatory (three weeks ahead).
 */
export default function Deadlines({ api, onSelect }: { api: PlannerApi; onSelect: (uid: string) => void }) {
    const { t } = useTranslation();
    const { state, run, busy, error } = api;
    const [form, setForm] = useState<'closed' | 'new' | StudyPlannerItem>('closed');
    const [showPast, setShowPast] = useState(false);
    const { open, past } = plannerEntries(state, { horizonDays: 21 });
    const groups = groupEntries(open, state.today);

    const row = (entry: Entry) => (
        <EntryRow key={entry.key} entry={entry} api={api} onSelect={onSelect} onEdit={(item) => setForm(item)} />
    );

    return (
        <section aria-labelledby="deadlines-h">
            <SectionHeader
                id="deadlines-h"
                icon={<ClipboardList aria-hidden="true" />}
                title={t('study_planner.deadlines.title')}
                description={t('study_planner.deadlines.description')}
                action={
                    form === 'closed' && state.subjects.length > 0 ? (
                        <button type="button" onClick={() => setForm('new')} className="vtk-button vtk-button-sm">
                            <Plus aria-hidden="true" />
                            {t('study_planner.deadlines.add')}
                        </button>
                    ) : undefined
                }
            />

            {form !== 'closed' && (
                <div className="mb-4">
                    <ItemForm
                        key={form === 'new' ? 'new' : form.id}
                        subjects={state.subjects}
                        initial={form === 'new' ? undefined : form}
                        today={state.today}
                        busy={busy}
                        onCancel={() => setForm('closed')}
                        onSubmit={async (item) => {
                            const ok = await run(form === 'new' ? { op: 'addItem', item } : { op: 'updateItem', id: form.id, item });
                            if (ok) setForm('closed');
                        }}
                    />
                </div>
            )}

            {error && form !== 'closed' && (
                <p role="alert" className="m-0 mb-3 text-body text-danger-text">
                    {error}
                </p>
            )}

            {groups.length === 0 ? (
                <p className="vtk-empty m-0 rounded-card border border-dashed border-border-strong">
                    {t('study_planner.deadlines.empty')}
                </p>
            ) : (
                <div className="vtk-list">
                    {groups.map((group) => (
                        <div key={group.key}>
                            <h3
                                className={cn(
                                    'm-0 border-b border-border bg-surface-muted px-4 py-2 text-small font-semibold',
                                    group.key === 'overdue' ? 'text-danger-text' : 'text-fg-muted',
                                )}
                            >
                                {t(`study_planner.deadlines.group.${group.key}`)}
                            </h3>
                            <ul className="m-0 list-none divide-y divide-border p-0">{group.entries.map(row)}</ul>
                        </div>
                    ))}
                </div>
            )}

            {past.length > 0 && (
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={() => setShowPast((v) => !v)}
                        aria-expanded={showPast}
                        className="vtk-link inline-flex min-h-9 items-center text-body"
                    >
                        {showPast ? t('study_planner.deadlines.hide_past') : t('study_planner.deadlines.show_past', { count: past.length })}
                    </button>
                    {showPast && <ul className="vtk-list m-0 list-none p-0">{past.map(row)}</ul>}
                </div>
            )}
        </section>
    );
}

function EntryRow({
    entry,
    api,
    onSelect,
    onEdit,
}: {
    entry: Entry;
    api: PlannerApi;
    onSelect: (uid: string) => void;
    onEdit: (item: StudyPlannerItem) => void;
}) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const { state, run, busy } = api;
    const [confirmDelete, setConfirmDelete] = useState(false);
    const days = daysBetween(state.today, entry.date);
    const urgency = entry.done
        ? 'text-fg-muted'
        : days < 0
            ? 'font-semibold text-danger-text'
            : days <= 2
                ? 'font-semibold text-warning-text'
                : 'text-fg-muted';
    const isItem = entry.type === 'item';
    const deadline = isItem && entry.item.kind === 'deadline';
    const title = isItem ? entry.item.title : entry.event.course;
    const subject = subjectName(entry.subject, locale) || (isItem ? entry.item.subjectLabel : '');
    const when = isItem
        ? entry.time
            ? deadline
                ? t('study_planner.deadlines.due_at', { time: entry.time })
                : `${entry.time}${entry.item.end ? `–${entry.item.end}` : ''}`
            : deadline
                ? t('study_planner.deadlines.end_of_day')
                : t('study_planner.deadlines.no_time')
        : `${entry.event.start}${entry.event.end ? `–${entry.event.end}` : ''}${entry.event.location ? `, ${entry.event.location}` : ''}`;
    const [, , d] = entry.date.split('-').map(Number);
    const month = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-BE', { month: 'short', timeZone: 'UTC' }).format(
        new Date(`${entry.date}T00:00:00Z`),
    );

    return (
        <li className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[48px_minmax(0,1fr)_auto]">
            <span
                aria-hidden="true"
                className={cn(
                    'flex w-12 flex-col items-center rounded-control border py-1.5 leading-none',
                    entry.done ? 'border-border text-fg-muted' : 'border-border-strong text-fg',
                )}
            >
                <span className="text-micro font-semibold text-fg-muted">{weekdayName(entry.date, locale, true)}</span>
                <span className="mt-1 text-title-lg font-semibold tabular">{d}</span>
                <span className="mt-0.5 text-micro text-fg-muted">{month}</span>
            </span>

            <div className="min-w-0">
                <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn('text-body font-semibold', entry.done ? 'text-fg-muted line-through' : 'text-fg')}>{title}</span>
                    {deadline ? (
                        <span className="vtk-badge vtk-badge-accent h-5 px-1.5 text-caption">{t('study_planner.deadlines.badge_deadline')}</span>
                    ) : (
                        <span className="vtk-badge vtk-badge-danger h-5 px-1.5 text-caption">
                            {isItem
                                ? t('study_planner.mark.mandatory_cap')
                                : `${t('study_planner.mark.mandatory_cap')} · ${t(typeKey(entry.event.type)).toLowerCase()}`}
                        </span>
                    )}
                </p>
                <p className="m-0 mt-0.5 text-small text-fg-muted">
                    <span className="sr-only">{entry.date}: </span>
                    {isItem && subject && <>{subject} · </>}
                    {when} · <span className={urgency}>{dayDistance(entry.date, state.today, locale)}</span>
                </p>
                {isItem && entry.item.note && (
                    <p className="m-0 mt-1.5 whitespace-pre-line text-body text-fg-secondary">{entry.item.note}</p>
                )}
            </div>

            <div className="col-start-2 flex items-center gap-1 sm:col-start-3 sm:row-start-1 sm:self-center">
                {isItem ? (
                    <>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => run({ op: 'itemDone', id: entry.item.id, value: !entry.done })}
                            aria-pressed={entry.done}
                            className={cn(
                                'vtk-button vtk-button-sm',
                                entry.done && 'border-success-border bg-success-bg text-success-text hover:bg-success-bg',
                            )}
                        >
                            <Check aria-hidden="true" />
                            {entry.done ? t('study_planner.deadlines.done') : t('study_planner.deadlines.mark_done')}
                        </button>
                        <button
                            type="button"
                            onClick={() => onEdit(entry.item)}
                            aria-label={t('study_planner.deadlines.edit', { title: entry.item.title })}
                            className="vtk-icon-button"
                        >
                            <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        {confirmDelete ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => run({ op: 'deleteItem', id: entry.item.id })}
                                onBlur={() => setConfirmDelete(false)}
                                autoFocus
                                className="vtk-button vtk-button-danger vtk-button-sm"
                            >
                                {t('study_planner.deadlines.delete')}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                aria-label={t('study_planner.deadlines.delete_named', { title: entry.item.title })}
                                className="vtk-icon-button hover:text-danger-text"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                        )}
                    </>
                ) : (
                    <button type="button" onClick={() => onSelect(entry.event.uid)} className="vtk-button vtk-button-sm">
                        {t('study_planner.deadlines.details')}
                    </button>
                )}
            </div>
        </li>
    );
}
