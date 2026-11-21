'use client';

import { cn } from '@/lib/utils';
import type { StudyPlannerTask } from '@/types/entities';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlannerApi } from '../useStudyPlanner';
import { TaskForm } from './Forms';
import { courseStyle, type BlokView } from './model';

/** The tasks of a day: tick off, change (also to another day) or delete each. */
export default function TaskList({ tasks, view, api }: { tasks: StudyPlannerTask[]; view: BlokView; api: PlannerApi }) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState<string | null>(null);
    const { run, busy } = api;

    if (tasks.length === 0) return null;
    return (
        <ul className="m-0 flex list-none flex-col p-0">
            {tasks.map((task) => {
                const course = view.course(task.subject);
                const missed = !task.done && task.date < view.today;
                if (editing === task.id) {
                    return (
                        <li key={task.id} className="border-t border-border py-3 first:border-t-0">
                            <TaskForm
                                view={view}
                                date={task.date}
                                task={task}
                                withDate
                                busy={busy}
                                onSubmit={async (input) => {
                                    const ok = await run({ op: 'updateTask', id: task.id, task: input });
                                    if (ok) setEditing(null);
                                    return ok;
                                }}
                                onCancel={() => setEditing(null)}
                            />
                        </li>
                    );
                }
                const label = course && task.title !== course.label ? `${course.label}: ${task.title}` : task.title;
                return (
                    <li key={task.id} className="group flex items-start gap-3 border-t border-border py-2.5 first:border-t-0" style={course ? courseStyle(course.colour) : undefined}>
                        <input
                            type="checkbox"
                            checked={task.done}
                            disabled={busy}
                            onChange={(e) => void run({ op: 'taskDone', id: task.id, value: e.target.checked })}
                            aria-label={label}
                            className="mt-0.5 size-4.5 shrink-0 cursor-pointer accent-primary"
                        />
                        <span className="min-w-0 flex-1 text-body">
                            {course && (
                                <span className="mr-1.5 inline-flex items-center gap-1.5 font-semibold text-fg">
                                    <span aria-hidden="true" className="plan-course-fill inline-block size-2.5 rounded-[3px]" />
                                    {course.label}
                                </span>
                            )}
                            {(!course || task.title !== course.label) && (
                                <span className={cn(task.done ? 'text-fg-muted line-through' : 'text-fg')}>{task.title}</span>
                            )}
                            {missed && <span className="ml-2 text-caption font-semibold text-plan-catchup-text">{t('study_planner.block.missed')}</span>}
                        </span>
                        <span className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={() => setEditing(task.id)}
                                aria-label={t('study_planner.block.task.edit', { task: label })}
                                className="vtk-icon-button size-7"
                            >
                                <Pencil className="size-3.5" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void run({ op: 'deleteTask', id: task.id })}
                                aria-label={t('study_planner.block.task.delete', { task: label })}
                                className="vtk-icon-button size-7"
                            >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
