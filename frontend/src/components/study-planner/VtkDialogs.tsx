'use client';

import { ApiClient } from '@/actions/api';
import { Dialog } from '@/components/ui/Dialog';
import { isErrorResponse } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { StudyPlannerVtkOption } from '@/types/entities';
import { convertToStudyPlannerVtkOptions } from '@/utils/convertToEntity';
import { DialogTitle } from '@headlessui/react';
import { Check, ExternalLink, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { longDay } from './time';
import type { PlannerApi } from './useStudyPlanner';
import { vtkTitle, vtkUrl, type VtkSlot } from './vtk';

/** One VTK event in the planner: when and where, a link to vtk.be, and taking it out. */
export function VtkEventDialog({ slot, api, onClose }: { slot: VtkSlot | null; api: PlannerApi; onClose: () => void }) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const [shown, setShown] = useState(slot);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (slot) setShown(slot);
    }, [slot]);
    const s = slot ?? shown;
    const o = s?.occurrence;

    return (
        <Dialog isOpen={slot !== null} onClose={onClose} size="md">
            {s && o && (
                <div className="text-left">
                    <p className="m-0 pr-10 text-small font-medium text-fg-muted">{t('study_planner.vtk.kind')}</p>
                    <DialogTitle as="h2" className="m-0 mt-0.5 pr-10 text-title-lg font-semibold text-fg">
                        {vtkTitle(s.event, locale)}
                        {o.label ? `: ${o.label}` : ''}
                    </DialogTitle>
                    <dl className="m-0 mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-body">
                        <dt className="text-fg-muted">{t('study_planner.event.when')}</dt>
                        <dd className="m-0 text-fg">
                            {longDay(o.date, locale)}
                            {o.allDay ? '' : `, ${o.start}${o.end ? `–${o.end}` : ''}`}
                            {o.endDate !== o.date ? ` (${t('study_planner.vtk.until', { day: longDay(o.endDate, locale) })})` : ''}
                        </dd>
                        {(o.location ?? s.event.location) && (
                            <>
                                <dt className="text-fg-muted">{t('study_planner.event.where')}</dt>
                                <dd className="m-0 text-fg">{o.location ?? s.event.location}</dd>
                            </>
                        )}
                    </dl>
                    <p className="m-0 mt-4 text-small text-fg-muted">{t('study_planner.vtk.dialog_hint')}</p>
                    {api.error && (
                        <p role="alert" className="m-0 mt-3 text-body text-danger-text">
                            {api.error}
                        </p>
                    )}
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            disabled={api.busy}
                            onClick={async () => {
                                if (await api.run({ op: 'removeVtkEvent', vtkEventId: s.event.id })) onClose();
                            }}
                            className="vtk-button"
                        >
                            {t('study_planner.vtk.remove')}
                        </button>
                        <a href={vtkUrl(s.event, locale)} target="_blank" rel="noreferrer" className="vtk-button vtk-button-primary">
                            <ExternalLink className="size-4" aria-hidden="true" />
                            {t('study_planner.vtk.open')}
                        </a>
                    </div>
                </div>
            )}
        </Dialog>
    );
}

/**
 * What is coming up at VTK, to put in the planner. Read from the VTK website through the backend
 * (GET /api/study_planner/vtk_events); which ones are in the planner follows the planner itself,
 * so a change made in the VTK app shows here too.
 */
export function VtkPickerDialog({ open, api, onClose }: { open: boolean; api: PlannerApi; onClose: () => void }) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const [options, setOptions] = useState<StudyPlannerVtkOption[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pending, setPending] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        (async () => {
            const result = await ApiClient('GET', '/api/study_planner/vtk_events');
            if (cancelled) return;
            if (result === null || isErrorResponse(result)) {
                setLoadError(isErrorResponse(result) ? result.error.detail || result.error.message || null : null);
            } else {
                setLoadError(null);
                setOptions(convertToStudyPlannerVtkOptions(result));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open]);

    const chosen = useMemo(() => new Set(api.state.vtkEvents.map((e) => e.id)), [api.state.vtkEvents]);
    const days = useMemo(() => {
        const out = new Map<string, StudyPlannerVtkOption[]>();
        for (const option of options ?? []) out.set(option.date, [...(out.get(option.date) ?? []), option]);
        return [...out.entries()];
    }, [options]);

    const toggle = async (option: StudyPlannerVtkOption) => {
        setPending(option.id);
        await api.run({ op: chosen.has(option.id) ? 'removeVtkEvent' : 'addVtkEvent', vtkEventId: option.id });
        setPending(null);
    };

    return (
        <Dialog isOpen={open} onClose={onClose} size="lg">
            <div className="text-left">
                <DialogTitle as="h2" className="m-0 pr-10 text-title-lg font-semibold text-fg">
                    {t('study_planner.vtk.picker_title')}
                </DialogTitle>
                <p className="m-0 mt-2 text-body text-fg-muted">{t('study_planner.vtk.picker_intro')}</p>
                {api.error && (
                    <p role="alert" className="m-0 mt-3 text-body text-danger-text">
                        {api.error}
                    </p>
                )}
                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
                    {options === null && !loadError && <p className="m-0 text-body text-fg-muted">{t('study_planner.vtk.loading')}</p>}
                    {loadError !== null || (options === null && loadError !== null) ? (
                        <p role="alert" className="m-0 text-body text-danger-text">
                            {t('study_planner.vtk.load_failed')} {loadError}
                        </p>
                    ) : null}
                    {options !== null && options.length === 0 && <p className="m-0 text-body text-fg-muted">{t('study_planner.vtk.empty')}</p>}
                    {days.map(([date, list]) => (
                        <section key={date} className="mb-4">
                            <h3 className="m-0 mb-1.5 text-small font-semibold text-fg-muted">{longDay(date, locale)}</h3>
                            <ul className="m-0 list-none divide-y divide-border rounded-card border border-border p-0">
                                {list.map((option) => {
                                    const inPlanner = chosen.has(option.id);
                                    const title = vtkTitle(option, locale);
                                    return (
                                        <li key={option.id} className="flex items-center gap-3 px-3 py-2.5">
                                            <span className="w-12 shrink-0 text-small font-semibold tabular text-fg">
                                                {option.allDay ? t('study_planner.vtk.all_day') : option.time}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <a href={vtkUrl(option, locale)} target="_blank" rel="noreferrer" className="block truncate text-body font-semibold text-fg hover:underline">
                                                    {title}
                                                </a>
                                                <span className="block truncate text-small text-fg-muted">
                                                    {[option.location, option.series ? t('study_planner.vtk.series') : null].filter(Boolean).join(', ')}
                                                </span>
                                            </span>
                                            <button
                                                type="button"
                                                disabled={api.busy}
                                                aria-pressed={inPlanner}
                                                aria-label={t(inPlanner ? 'study_planner.vtk.remove_named' : 'study_planner.vtk.add_named', { title })}
                                                title={t(inPlanner ? 'study_planner.vtk.remove' : 'study_planner.vtk.add')}
                                                onClick={() => void toggle(option)}
                                                className={cn('vtk-button vtk-button-sm shrink-0', inPlanner && 'vtk-button-primary', pending === option.id && 'opacity-60')}
                                            >
                                                {inPlanner ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                                                <span className="hidden sm:inline">{t(inPlanner ? 'study_planner.vtk.in_planner' : 'study_planner.vtk.add')}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>
                <div className="mt-4 flex justify-end">
                    <button type="button" onClick={onClose} className="vtk-button">
                        {t('study_planner.export.close')}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
