'use client';

import { Dialog } from '@/components/ui/Dialog';
import type { StudyPlanner } from '@/types/entities';
import { DialogTitle } from '@headlessui/react';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LinkForm } from './SetupPanel';
import { dateTime } from './time';
import type { StudyPlannerHandle } from './useStudyPlanner';

/** The timetable link: sync now, change it, add older sessions from a file, or stop and forget everything. */
export default function SettingsDialog({
    open,
    state,
    handle,
    onClose,
}: {
    open: boolean;
    state: StudyPlanner;
    handle: StudyPlannerHandle;
    onClose: () => void;
}) {
    const { t, i18n } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [confirmStop, setConfirmStop] = useState(false);
    const [imported, setImported] = useState<number | null>(null);
    const [unreadable, setUnreadable] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const close = () => {
        setEditing(false);
        setConfirmStop(false);
        setImported(null);
        setUnreadable(false);
        handle.clearError();
        onClose();
    };

    return (
        <Dialog isOpen={open} onClose={close} size="lg">
            <div className="text-left">
                <DialogTitle as="h2" className="m-0 pr-10 text-title-lg font-semibold text-fg">
                    {t('study_planner.settings.title')}
                </DialogTitle>

                <div className="mt-4 space-y-5">
                    <div>
                        <p className="m-0 text-small font-semibold text-fg">{t('study_planner.settings.sync_title')}</p>
                        <p className="m-0 mt-0.5 text-body text-fg-muted">
                            {state.lastSync
                                ? t('study_planner.settings.synced', { when: dateTime(state.lastSync, i18n.language) })
                                : t('study_planner.settings.never_synced')}{' '}
                            {t('study_planner.settings.sync_auto')}
                        </p>
                        {state.syncError && (
                            <p className="m-0 mt-1 text-body text-danger-text">
                                {t('study_planner.settings.sync_failed', { error: state.syncError })}
                            </p>
                        )}
                        <button type="button" disabled={handle.busy} onClick={() => void handle.sync()} className="vtk-button mt-2">
                            <RefreshCw aria-hidden="true" className={handle.busy ? "size-4 animate-spin" : "size-4"} />
                            {t('study_planner.settings.sync_now')}
                        </button>
                    </div>

                    <div className="border-t border-border pt-5">
                        <p className="m-0 text-small font-semibold text-fg">{t('study_planner.settings.link_title')}</p>
                        {editing ? (
                            <div className="mt-2">
                                <p className="m-0 mb-3 text-small text-fg-muted">{t('study_planner.settings.change_warning')}</p>
                                <LinkForm
                                    initial={state.icsUrl ?? ''}
                                    busy={handle.busy}
                                    error={handle.error}
                                    submitLabel={t('study_planner.settings.save_link')}
                                    onCancel={() => {
                                        setEditing(false);
                                        handle.clearError();
                                    }}
                                    onSubmit={async (link) => {
                                        if (await handle.subscribe(link)) setEditing(false);
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                <p className="m-0 mt-1 break-all font-mono text-small text-fg-muted">{state.icsUrl}</p>
                                <button type="button" onClick={() => setEditing(true)} className="vtk-button mt-2">
                                    {t('study_planner.settings.change_link')}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="border-t border-border pt-5">
                        <p className="m-0 text-small font-semibold text-fg">{t('study_planner.settings.import_title')}</p>
                        <p className="m-0 mt-0.5 text-body text-fg-muted">{t('study_planner.settings.import_help')}</p>
                        <input
                            ref={fileInput}
                            type="file"
                            accept=".ics,text/calendar"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (!file) return;
                                setImported(null);
                                setUnreadable(false);
                                let ics: string;
                                try {
                                    ics = await file.text();
                                } catch {
                                    setUnreadable(true);
                                    return;
                                }
                                setImported(await handle.importIcs(ics));
                            }}
                        />
                        <button
                            type="button"
                            disabled={handle.busy}
                            onClick={() => fileInput.current?.click()}
                            className="vtk-button mt-2"
                        >
                            <CalendarPlus aria-hidden="true" className="size-4" />
                            {t('study_planner.settings.import_button')}
                        </button>
                        {imported !== null && (
                            <p role="status" className="m-0 mt-2 text-body text-fg-muted">
                                {imported > 0
                                    ? t('study_planner.settings.imported', { count: imported })
                                    : t('study_planner.settings.imported_none')}
                            </p>
                        )}
                        {unreadable && (
                            <p role="alert" className="m-0 mt-2 text-body text-danger-text">
                                {t('study_planner.settings.import_unreadable')}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-border pt-5">
                        <p className="m-0 text-small font-semibold text-fg">{t('study_planner.settings.stop_title')}</p>
                        <p className="m-0 mt-0.5 text-body text-fg-muted">{t('study_planner.settings.stop_help')}</p>
                        {confirmStop ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                                <button type="button" onClick={() => setConfirmStop(false)} className="vtk-button">
                                    {t('study_planner.form.cancel')}
                                </button>
                                <button
                                    type="button"
                                    disabled={handle.busy}
                                    onClick={async () => {
                                        if (await handle.unsubscribe()) close();
                                    }}
                                    className="vtk-button vtk-button-danger"
                                >
                                    {t('study_planner.settings.stop_confirm')}
                                </button>
                            </div>
                        ) : (
                            <button type="button" onClick={() => setConfirmStop(true)} className="vtk-button mt-2 text-danger-text">
                                {t('study_planner.settings.stop')}
                            </button>
                        )}
                    </div>

                    {handle.error && !editing && (
                        <p role="alert" className="m-0 text-body text-danger-text">
                            {handle.error}
                        </p>
                    )}
                </div>
            </div>
        </Dialog>
    );
}
