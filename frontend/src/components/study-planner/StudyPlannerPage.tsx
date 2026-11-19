'use client';

import Loading from '@/components/loading/LoadingPage';
import PageHeader, { Breadcrumbs } from '@/components/layout/PageHeader';
import PlannerInfo from '@/components/study-planner/PlannerInfo';
import { cn } from '@/lib/utils';
import { AlertTriangle, CalendarDays, CalendarPlus, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Deadlines from './Deadlines';
import EventDialog from './EventDialog';
import ExportDialog from './ExportDialog';
import { buildSemester, defaultSemester, semesterKeys } from './model';
import { CourseList, SemesterGrid, TotalsRow } from './Overview';
import SettingsDialog from './SettingsDialog';
import SetupPanel from './SetupPanel';
import { dateTime, nowInLeuven, shortDay } from './time';
import { useStudyPlanner, type PlannerApi } from './useStudyPlanner';
import WeekCalendar from './WeekCalendar';

type View = 'week' | 'courses' | 'grid';
const VIEWS: View[] = ['week', 'courses', 'grid'];

function initialParams(): { view: View; course: string | null; semester: string | null } {
    if (typeof window === 'undefined') return { view: 'week', course: null, semester: null };
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    return {
        view: VIEWS.includes(view as View) ? (view as View) : 'week',
        course: params.get('course'),
        semester: params.get('semester'),
    };
}

/**
 * The study planner: the reader's KU Leuven timetable as a week view with their deadlines, and an
 * overview of the semester per course (what is ticked off, what to catch up, what is still to
 * come) as a list or a grid. The first visit asks for the timetable's subscription link.
 */
export default function StudyPlannerPage() {
    const { t, i18n } = useTranslation();
    const handle = useStudyPlanner();
    const { state } = handle;
    const [initial] = useState(initialParams);
    const [view, setView] = useState<View>(initial.view);
    const [course, setCourse] = useState<string | null>(initial.course);
    const [semesterChoice, setSemester] = useState<string | null>(initial.semester);
    const [selected, setSelected] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [settings, setSettings] = useState(false);

    const keys = useMemo(() => (state ? semesterKeys(state) : []), [state]);
    const fallback = state ? defaultSemester(state, keys) : null;
    const semester = semesterChoice && keys.includes(semesterChoice) ? semesterChoice : fallback;
    const data = useMemo(
        () => (state && semester ? buildSemester(state, semester, state.today === nowInLeuven().date ? nowInLeuven().minutes : state.now) : null),
        [state, semester],
    );
    const row = data ? (data.rows.find((r) => r.subject.key === course) ?? data.rows[0] ?? null) : null;

    // Keep the choices in the address, so a reload or a shared link opens the same view.
    useEffect(() => {
        const params = new URLSearchParams();
        if (view !== 'week') params.set('view', view);
        if (view !== 'week' && semester && semester !== fallback) params.set('semester', semester);
        if (view === 'courses' && course) params.set('course', course);
        const query = params.toString();
        window.history.replaceState(window.history.state, '', query ? `?${query}` : window.location.pathname);
    }, [view, semester, course, fallback]);

    const subscribed = state?.subscribed === true;
    const header = (
        <PageHeader
            breadcrumb={
                <div className="flex min-w-0 flex-1 items-center gap-1">
                    <Breadcrumbs crumbs={[{ label: t('study_planner.title'), icon: <CalendarDays /> }]} className="flex-none" />
                    <PlannerInfo />
                </div>
            }
            actions={
                subscribed && (
                    <>
                        <button
                            type="button"
                            onClick={() => setSettings(true)}
                            className="vtk-icon-button"
                            aria-label={t('study_planner.settings.title')}
                            title={t('study_planner.settings.title')}
                        >
                            <Settings2 className="size-[18px]" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => setExporting(true)} className="vtk-button vtk-button-sm">
                            <CalendarPlus className="size-4" aria-hidden="true" />
                            <span className="hidden sm:inline">{t('study_planner.export.button')}</span>
                        </button>
                    </>
                )
            }
        />
    );

    if (handle.loading) {
        return (
            <>
                {header}
                <Loading variant="planner" />
            </>
        );
    }

    if (!state) {
        return (
            <>
                {header}
                <div className="vtk-shell">
                    <p role="alert" className="vtk-empty m-0 rounded-card border border-border">
                        {t('study_planner.load_failed')} {handle.loadError}
                    </p>
                </div>
            </>
        );
    }

    if (!state.subscribed) {
        return (
            <>
                {header}
                <div className="vtk-shell">
                    <SetupPanel busy={handle.busy} error={handle.error} onSubmit={(link) => void handle.subscribe(link)} />
                </div>
            </>
        );
    }

    const api: PlannerApi = { state, run: handle.run, busy: handle.busy, error: handle.error };
    const event = selected ? (state.events.find((e) => e.uid === selected) ?? null) : null;
    const eyebrow = data
        ? data.current
            ? t('study_planner.overview.semester_week', { semester: t(`study_planner.overview.semester_${data.key.slice(-1)}`), week: data.current, weeks: data.totalWeeks })
            : `${t(`study_planner.overview.semester_${data.key.slice(-1)}`)} · ${shortDay(data.firstDate, i18n.language)} – ${shortDay(data.lastDate, i18n.language)}`
        : null;

    return (
        <>
            {header}
            <div className="vtk-shell">
                {state.syncError && (
                    <div role="status" className="mb-5 flex items-start gap-2.5 rounded-card border border-warning-border bg-warning-bg px-4 py-3 text-body text-warning-text">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <p className="m-0">
                            {t('study_planner.sync_warning', { error: state.syncError })}{' '}
                            <button type="button" onClick={() => setSettings(true)} className="font-medium underline underline-offset-4">
                                {t('study_planner.settings.title')}
                            </button>
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
                    <div role="tablist" aria-label={t('study_planner.title')} className="flex items-center gap-5">
                        {VIEWS.map((key) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={view === key}
                                onClick={() => setView(key)}
                                className={cn(
                                    'relative -mb-px inline-flex h-10 items-center border-b-2 text-body font-medium transition-colors',
                                    view === key ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg',
                                )}
                            >
                                {t(`study_planner.tabs.${key}`)}
                            </button>
                        ))}
                    </div>
                    <p className="m-0 hidden pb-2.5 text-small text-fg-muted sm:block">
                        {state.lastSync && t('study_planner.synced_at', { when: dateTime(state.lastSync, i18n.language) })}
                    </p>
                </div>

                <div className="mt-6">
                    {view === 'week' ? (
                        <>
                            <WeekCalendar api={api} onSelect={setSelected} />
                            <div className="mt-10">
                                <Deadlines api={api} onSelect={setSelected} />
                            </div>
                        </>
                    ) : !data ? (
                        <p className="vtk-empty m-0 rounded-card border border-dashed border-border-strong">{t('study_planner.overview.empty')}</p>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <p className="m-0 text-small font-medium text-link">{eyebrow}</p>
                                {keys.length > 1 && semester && (
                                    <div className="vtk-tabs" role="group" aria-label={t('study_planner.overview.semester')}>
                                        {keys.map((k) => (
                                            <button
                                                key={k}
                                                type="button"
                                                aria-pressed={k === semester}
                                                onClick={() => setSemester(k)}
                                                className={cn('vtk-tab', k === semester && 'is-active')}
                                            >
                                                {t(`study_planner.overview.semester_${k.slice(-1)}`)} {k.slice(0, 4)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <TotalsRow totals={data.totals} />
                            <div className="mt-6">
                                {view === 'courses' ? (
                                    row && <CourseList data={data} row={row} api={api} onCourse={setCourse} onSelect={setSelected} />
                                ) : (
                                    <SemesterGrid
                                        data={data}
                                        onCourse={(key) => {
                                            setCourse(key);
                                            setView('courses');
                                        }}
                                    />
                                )}
                            </div>
                            {handle.error && (
                                <p role="alert" className="m-0 mt-4 text-body text-danger-text">
                                    {handle.error}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            <EventDialog event={event} api={api} onClose={() => setSelected(null)} />
            <ExportDialog
                open={exporting}
                feedPath={state.feedPath}
                busy={handle.busy}
                onRotate={handle.rotateFeed}
                onClose={() => setExporting(false)}
            />
            <SettingsDialog open={settings} state={state} handle={handle} onClose={() => setSettings(false)} />
        </>
    );
}
