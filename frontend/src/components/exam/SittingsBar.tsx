'use client'

import { MAX_SITTING_LABEL } from '@/components/exam/useSittings';
import type { ExamSitting } from '@/types/entities';
import { CalendarDays, Plus, X } from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface SittingsBarProps {
    sittings: ExamSitting[];
    editable: boolean;
    onAdd?: (label: string) => void;
    onRename?: (id: string, label: string) => void;
    onRemove?: (id: string) => void;
}

/**
 * The days an exam was given on ("ma 20 jan", "mondeling dag 2"). Students add them here and
 * then mark on each question which days it came up, which covers oral exams that draw from one
 * pool over several days as well as two-day written exams.
 */
export default function SittingsBar({ sittings, editable, onAdd, onRename, onRemove }: SittingsBarProps) {
    const { t } = useTranslation();
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState('');

    if (!editable && sittings.length === 0) {
        return null;
    }

    const submitNew = (event: FormEvent) => {
        event.preventDefault();
        if (draft.trim() !== '') {
            onAdd?.(draft);
        }
        setDraft('');
        setAdding(false);
    };

    const submitRename = (event?: FormEvent) => {
        event?.preventDefault();
        if (editing && editDraft.trim() !== '') {
            onRename?.(editing, editDraft);
        }
        setEditing(null);
    };

    const cancelOnEscape = (cancel: () => void) => (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('exam.sittings.title')}>
            <span className="vtk-label mr-1 inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {t('exam.sittings.title')}
            </span>

            {sittings.map((sitting) => (
                editing === sitting.id ? (
                    <form key={sitting.id} onSubmit={submitRename} className="inline-flex">
                        <input
                            autoFocus
                            value={editDraft}
                            maxLength={MAX_SITTING_LABEL}
                            onChange={(event) => setEditDraft(event.target.value)}
                            onBlur={() => submitRename()}
                            onKeyDown={cancelOnEscape(() => setEditing(null))}
                            aria-label={t('exam.sittings.rename', { label: sitting.label })}
                            className="vtk-input min-h-8! w-40 rounded-full! px-3! py-1! text-sm"
                        />
                    </form>
                ) : (
                    <span key={sitting.id} className="exam-chip exam-chip--day">
                        {editable ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditing(sitting.id);
                                    setEditDraft(sitting.label);
                                }}
                                title={t('exam.sittings.rename', { label: sitting.label })}
                            >
                                {sitting.label}
                            </button>
                        ) : sitting.label}
                        {editable && (
                            <button
                                type="button"
                                onClick={() => onRemove?.(sitting.id)}
                                aria-label={t('exam.sittings.remove', { label: sitting.label })}
                                title={t('exam.sittings.remove', { label: sitting.label })}
                                className="-mr-1 opacity-60 hover:opacity-100"
                            >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        )}
                    </span>
                )
            ))}

            {editable && (adding ? (
                <form onSubmit={submitNew} className="inline-flex items-center gap-1.5">
                    <input
                        autoFocus
                        value={draft}
                        maxLength={MAX_SITTING_LABEL}
                        placeholder={t('exam.sittings.placeholder')}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={cancelOnEscape(() => setAdding(false))}
                        aria-label={t('exam.sittings.new')}
                        className="vtk-input min-h-8! w-48 rounded-full! px-3! py-1! text-sm"
                    />
                    <button type="submit" className="vtk-button vtk-button-sm">{t('exam.sittings.add')}</button>
                    <button type="button" className="vtk-button vtk-button-sm vtk-button-ghost" onClick={() => setAdding(false)}>
                        {t('exam.cancel')}
                    </button>
                </form>
            ) : (
                <button type="button" className="vtk-button vtk-button-sm vtk-button-ghost" onClick={() => setAdding(true)}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {sittings.length === 0 ? t('exam.sittings.add-first') : t('exam.sittings.add')}
                </button>
            ))}
        </div>
    );
}
