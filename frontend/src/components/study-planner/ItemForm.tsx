'use client';

import { cn } from '@/lib/utils';
import type { StudyPlannerItem, StudyPlannerItemInput, StudyPlannerItemKind, StudyPlannerSubject } from '@/types/entities';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subjectName } from './model';

/** Adds or edits a deadline or a mandatory session. */
export default function ItemForm({
    subjects,
    initial,
    today,
    busy,
    onSubmit,
    onCancel,
}: {
    subjects: StudyPlannerSubject[];
    initial?: StudyPlannerItem;
    today: string;
    busy: boolean;
    onSubmit: (input: StudyPlannerItemInput) => void;
    onCancel: () => void;
}) {
    const { t, i18n } = useTranslation();
    const id = useId();
    const [subject, setSubject] = useState(initial?.subject ?? subjects[0]?.key ?? '');
    const [kind, setKind] = useState<StudyPlannerItemKind>(initial?.kind ?? 'deadline');
    const [title, setTitle] = useState(initial?.title ?? '');
    const [date, setDate] = useState(initial?.date ?? today);
    const [time, setTime] = useState(initial?.time ?? '');
    const [end, setEnd] = useState(initial?.end ?? '');
    const [note, setNote] = useState(initial?.note ?? '');

    // A mandatory session can have an end time (for the exported calendar); a deadline has one time.
    const withEnd = kind === 'mandatory';
    const badEnd = withEnd && end !== '' && (time === '' || end <= time);
    const options = subjects.some((s) => s.key === subject) || !initial
        ? subjects
        : [...subjects, { key: initial.subject, label: initial.subjectLabel, courseId: null, courseCode: null, nameNl: null, nameEn: null }];

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit({ subject, kind, title, date, time: time || null, end: withEnd && time && end ? end : null, note });
            }}
            className="vtk-panel grid max-w-[760px] gap-x-4 gap-y-4 p-5 sm:grid-cols-2"
        >
            <h3 className="m-0 text-title font-semibold text-fg sm:col-span-2">
                {t(initial ? `study_planner.form.edit_${kind}` : `study_planner.form.new_${kind}`)}
            </h3>

            <div className="vtk-field sm:col-span-2">
                <label htmlFor={`${id}-subject`} className="vtk-field-label">
                    {t('study_planner.form.course')}
                </label>
                <select id={`${id}-subject`} value={subject} onChange={(e) => setSubject(e.target.value)} className="vtk-select" required>
                    {options.map((s) => (
                        <option key={s.key} value={s.key}>
                            {subjectName(s)}
                        </option>
                    ))}
                </select>
            </div>

            <fieldset className="m-0 border-0 p-0 sm:col-span-2">
                <legend className="vtk-field-label mb-1.5">{t('study_planner.form.type')}</legend>
                <div className="vtk-tabs">
                    {(['deadline', 'mandatory'] as const).map((value) => (
                        <label
                            key={value}
                            className={cn('vtk-tab has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus', kind === value && 'is-active')}
                        >
                            <input
                                type="radio"
                                name={`${id}-kind`}
                                value={value}
                                checked={kind === value}
                                onChange={() => setKind(value)}
                                className="sr-only"
                            />
                            {t(`study_planner.form.kind_${value}`)}
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="vtk-field sm:col-span-2">
                <label htmlFor={`${id}-title`} className="vtk-field-label">
                    {t('study_planner.form.title')}
                </label>
                <input
                    id={`${id}-title`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                    placeholder={t(`study_planner.form.title_placeholder_${kind}`)}
                    className="vtk-input"
                />
            </div>

            <div className="vtk-field">
                <label htmlFor={`${id}-date`} className="vtk-field-label">
                    {t('study_planner.form.date')}
                </label>
                <input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="vtk-input" />
            </div>
            <div className={withEnd ? 'grid grid-cols-2 gap-3' : ''}>
                <div className="vtk-field">
                    <label htmlFor={`${id}-time`} className="vtk-field-label">
                        {t(withEnd ? 'study_planner.form.start' : 'study_planner.form.time')}{' '}
                        <span className="font-normal text-fg-muted">({t('study_planner.form.optional')})</span>
                    </label>
                    <input id={`${id}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="vtk-input" />
                </div>
                {withEnd && (
                    <div className="vtk-field">
                        <label htmlFor={`${id}-end`} className="vtk-field-label">
                            {t('study_planner.form.end')} <span className="font-normal text-fg-muted">({t('study_planner.form.optional')})</span>
                        </label>
                        <input
                            id={`${id}-end`}
                            type="time"
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                            aria-invalid={badEnd}
                            aria-describedby={badEnd ? `${id}-end-error` : undefined}
                            className={cn('vtk-input', badEnd && 'border-danger')}
                        />
                        {badEnd && (
                            <p id={`${id}-end-error`} className="vtk-error-text m-0 mt-1">
                                {t(time ? 'study_planner.form.end_after_start' : 'study_planner.form.start_first')}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="vtk-field sm:col-span-2">
                <label htmlFor={`${id}-note`} className="vtk-field-label">
                    {t('study_planner.form.note')} <span className="font-normal text-fg-muted">({t('study_planner.form.optional')})</span>
                </label>
                <textarea
                    id={`${id}-note`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder={t('study_planner.form.note_placeholder')}
                    className="vtk-textarea"
                />
            </div>

            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={onCancel} className="vtk-button">
                    {t('study_planner.form.cancel')}
                </button>
                <button type="submit" disabled={busy || !title.trim() || !date || !subject || badEnd} className="vtk-button vtk-button-primary">
                    {busy ? t('study_planner.form.saving') : initial ? t('study_planner.form.save') : t('study_planner.form.add')}
                </button>
            </div>
        </form>
    );
}
