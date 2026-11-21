'use client';

import { CalendarDays, GraduationCap } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The KU Leuven timetable link: the first thing on an empty planner, and the "change link" form in
 * the settings.
 */
export function LinkForm({
    initial = '',
    busy,
    error,
    submitLabel,
    onSubmit,
    onCancel,
}: {
    initial?: string;
    busy: boolean;
    error: string | null;
    submitLabel: string;
    onSubmit: (link: string) => void;
    onCancel?: () => void;
}) {
    const { t } = useTranslation();
    const id = useId();
    const [link, setLink] = useState(initial);
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(link);
            }}
        >
            <div className="vtk-field">
                <label htmlFor={`${id}-link`} className="vtk-field-label">
                    {t('study_planner.setup.link_label')}
                </label>
                <input
                    id={`${id}-link`}
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    required
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="webcal://cloud.timeedit.net/be_kuleuven/web/public/s.ics?…"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className="vtk-input font-mono text-small"
                />
                {error && (
                    <p id={`${id}-error`} role="alert" className="vtk-error-text m-0 mt-1">
                        {error}
                    </p>
                )}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="vtk-button">
                        {t('study_planner.form.cancel')}
                    </button>
                )}
                <button type="submit" disabled={busy || !link.trim()} className="vtk-button vtk-button-primary">
                    {busy ? t('study_planner.setup.loading') : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default function SetupPanel({
    busy,
    error,
    onSubmit,
    onPlanExams,
}: {
    busy: boolean;
    error: string | null;
    onSubmit: (link: string) => void;
    /** Opens the exam period, which needs no timetable. */
    onPlanExams: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="mx-auto max-w-[640px]">
            <span className="grid size-10 place-items-center rounded-control border border-border bg-surface-muted text-icon-strong">
                <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <h1 className="vtk-page-title mt-4">{t('study_planner.setup.title')}</h1>
            <p className="vtk-page-subtitle">{t('study_planner.setup.intro')}</p>

            <ul className="m-0 mt-4 list-disc space-y-1 pl-5 text-body text-fg-secondary marker:text-fg-placeholder">
                <li>{t('study_planner.setup.feature_week')}</li>
                <li>{t('study_planner.setup.feature_marks')}</li>
                <li>{t('study_planner.setup.feature_overview')}</li>
                <li>{t('study_planner.setup.feature_export')}</li>
            </ul>

            <div className="vtk-panel mt-6 p-5">
                <h2 className="m-0 text-title font-semibold">{t('study_planner.setup.how_title')}</h2>
                <ol className="m-0 mt-2 mb-5 list-decimal space-y-1 pl-5 text-body text-fg-secondary marker:text-fg-muted">
                    <li>{t('study_planner.setup.how_1')}</li>
                    <li>{t('study_planner.setup.how_2')}</li>
                    <li>{t('study_planner.setup.how_3')}</li>
                </ol>
                <LinkForm busy={busy} error={error} submitLabel={t('study_planner.setup.submit')} onSubmit={onSubmit} />
            </div>
            <p className="m-0 mt-3 text-small text-fg-muted">{t('study_planner.setup.privacy')}</p>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface-muted px-5 py-4">
                <div className="min-w-0 flex-[1_1_320px]">
                    <h2 className="m-0 text-title font-semibold">{t('study_planner.setup.exams_title')}</h2>
                    <p className="m-0 mt-0.5 text-body text-fg-secondary">{t('study_planner.setup.exams_text')}</p>
                </div>
                <button type="button" onClick={onPlanExams} className="vtk-button">
                    <GraduationCap className="size-4" aria-hidden="true" />
                    {t('study_planner.setup.exams_button')}
                </button>
            </div>
        </div>
    );
}
