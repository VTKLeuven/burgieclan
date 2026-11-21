'use client';

import { COURSE_SEARCH_MIN_LENGTH, useCourseSearch } from '@/hooks/useCourseSearch';
import { cn } from '@/lib/utils';
import { courseTitle } from '@/utils/courseName';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { courseStyle, type BlokView } from './model';

export interface PickedCourse {
    /** "course:{id}" or "name:{name}" */
    key: string;
    label: string;
}

/**
 * Picks a course: one of the student's own (exams, tasks, timetable), one from Burgieclan's
 * catalogue, or any name typed in. Shows the chosen one as a chip that can be cleared.
 */
export default function CoursePicker({
    id,
    view,
    value,
    onChange,
    placeholder,
    invalid,
}: {
    id: string;
    view: BlokView;
    value: PickedCourse | null;
    onChange: (course: PickedCourse | null) => void;
    placeholder: string;
    invalid?: boolean;
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const { courses: found, isSearching } = useCourseSearch(query);
    const typed = query.trim().replace(/\s+/g, ' ');

    if (value) {
        const own = view.course(value.key);
        return (
            <span className="flex min-h-10 items-center gap-2 rounded-control border border-border-field bg-surface px-3 py-1.5">
                <span
                    aria-hidden="true"
                    className={cn('size-2.5 shrink-0 rounded-[3px]', own ? 'plan-course-fill' : 'bg-neutral-300')}
                    style={own ? courseStyle(own.colour) : undefined}
                />
                <span className="min-w-0 flex-1 text-body text-fg [overflow-wrap:anywhere]">{value.label}</span>
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    aria-label={t('study_planner.block.picker.clear', { course: value.label })}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-surface-hover hover:text-fg"
                >
                    <X className="size-3.5" aria-hidden="true" />
                </button>
            </span>
        );
    }

    const lower = typed.toLowerCase();
    const mine = view.options.filter((o) => !lower || o.label.toLowerCase().includes(lower)).slice(0, 8);
    const catalogue = found.filter((c) => !mine.some((o) => o.key === `course:${c.id}`)).slice(0, 6);
    const pick = (course: PickedCourse) => {
        onChange(course);
        setQuery('');
        setOpen(false);
    };
    const option = 'flex w-full items-center gap-2 px-3 py-2 text-left text-body text-fg hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none';

    return (
        <div className="relative">
            <input
                id={id}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && typed) {
                        e.preventDefault();
                        pick(mine.find((o) => o.label.toLowerCase() === lower) ?? { key: `name:${typed}`, label: typed });
                    }
                    if (e.key === 'Escape') setOpen(false);
                }}
                maxLength={200}
                autoComplete="off"
                placeholder={placeholder}
                aria-invalid={invalid || undefined}
                className={cn('vtk-input w-full', invalid && 'border-danger')}
            />
            {open && (mine.length > 0 || typed) && (
                // In the flow rather than floating: dialogs clip what sticks out of them. mousedown keeps the
                // focus in the input, so blur does not close the list before the click.
                <ul
                    onMouseDown={(e) => e.preventDefault()}
                    className="m-0 mt-1 max-h-64 list-none overflow-y-auto rounded-card border border-border bg-surface p-0 shadow-sm"
                >
                    {mine.map((o) => {
                        const own = view.course(o.key);
                        return (
                            <li key={o.key}>
                                <button type="button" onClick={() => pick(o)} className={option}>
                                    <span
                                        aria-hidden="true"
                                        className={cn('size-2.5 shrink-0 rounded-[3px]', own ? 'plan-course-fill' : 'bg-neutral-300')}
                                        style={own ? courseStyle(own.colour) : undefined}
                                    />
                                    {o.label}
                                </button>
                            </li>
                        );
                    })}
                    {catalogue.map((c) => (
                        <li key={c.id} className={cn(mine.length > 0 && c === catalogue[0] && 'border-t border-border')}>
                            <button type="button" onClick={() => pick({ key: `course:${c.id}`, label: courseTitle(c) })} className={cn(option, 'justify-between')}>
                                <span className="min-w-0">{courseTitle(c)}</span>
                                {c.code && <span className="shrink-0 text-caption text-fg-muted">{c.code}</span>}
                            </button>
                        </li>
                    ))}
                    {typed.length >= COURSE_SEARCH_MIN_LENGTH && isSearching && (
                        <li className="px-3 py-2 text-small text-fg-muted">{t('study_planner.block.picker.searching')}</li>
                    )}
                    {typed && (
                        <li className="border-t border-border">
                            <button type="button" onClick={() => pick({ key: `name:${typed}`, label: typed })} className={option}>
                                <Plus className="size-4 shrink-0 text-icon" aria-hidden="true" />
                                {t('study_planner.block.picker.own', { name: typed })}
                            </button>
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
