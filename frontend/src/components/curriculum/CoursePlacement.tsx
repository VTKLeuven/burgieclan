'use client';

import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import { ChevronRight, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The other programmes a course is taught in.
 *
 * Half the engineering courses are shared, so "am I looking at the right Beton?" is a real
 * question and the breadcrumb can only answer it for one branch at a time. Picking another
 * one here re-points the breadcrumb and the folder tree at that programme instead of
 * navigating away, because the course, its documents and its comments are the same either way
 * - only the surroundings differ.
 */
export default function CoursePlacement() {
    const { t } = useTranslation();
    const { paths, activePath, chooseBranch } = useCurriculumLocation();

    // With one placement the breadcrumb already says everything there is to say.
    if (paths.length < 2) {
        return null;
    }

    return (
        <div className="mt-5">
            <div className="vtk-label mb-2 flex items-center gap-1.5 text-vtk-muted">
                <Network size={14} aria-hidden="true" />
                {t('course-page.placement.label')}
            </div>
            <div className="flex flex-wrap gap-2">
                {paths.map((path) => {
                    const leafModuleId = path.modules.at(-1)?.id;
                    const isActive = path === activePath;

                    return (
                        <button
                            key={`${path.program.id}:${leafModuleId}`}
                            type="button"
                            onClick={() => leafModuleId !== undefined && chooseBranch(leafModuleId)}
                            aria-pressed={isActive}
                            className={`vtk-badge flex items-center gap-1 text-left transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy focus-visible:ring-offset-1 ${isActive
                                ? 'vtk-badge-accent'
                                : 'vtk-badge-muted hover:border-vtk-line-2 hover:bg-vtk-surface hover:text-vtk-ink'
                                }`}
                        >
                            <span>{path.program.name}</span>
                            {path.modules.map((module) => (
                                <span key={module.id} className="flex items-center gap-1 text-vtk-muted">
                                    <ChevronRight size={11} aria-hidden="true" />
                                    <span>{module.name}</span>
                                </span>
                            ))}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
