'use client';

import ProfessorDiv from '@/components/coursepage/ProfessorDiv';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import SemesterIndicator from '@/components/ui/SemesterIndicator';
import CourseBadge from '@/components/layout/CourseBadge';
import type { Course, Module, Program } from '@/types/entities';
import { localizedCourseName } from '@/utils/courseName';
import { shortProgramName } from '@/utils/curriculumLabels';
import { rememberBranch } from '@/utils/curriculumBranch';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** A course together with the one branch this result found it under. */
export interface CourseHit {
    course: Course;
    program: Program;
    modules: Module[];
    /** The programme's language, which decides which of the course's titles to show. */
    language?: string;
}

/**
 * Search results as a flat list of courses, each carrying the branch it was found in.
 *
 * Searching used to auto-expand the tree and leave the reader to find the highlighted rows
 * somewhere inside it. A course that matched four levels down was still four levels down. The
 * hit itself is the thing worth clicking, and the path under it answers "is this the right one"
 * without going anywhere.
 */
export default function CurriculumSearchResults({ hits }: { hits: CourseHit[] }) {
    const { t, i18n } = useTranslation();

    if (hits.length === 0) {
        return <div className="vtk-panel vtk-empty mt-5">{t('curriculum-navigator.no-search-results')}</div>;
    }

    return (
        <div className="mt-5">
            <p className="m-0 mb-2 text-small text-fg-muted tabular">
                {t('curriculum-navigator.result-count', { count: hits.length })}
            </p>
            <div className="vtk-list">
                {hits.map(({ course, program, modules, language }) => (
                    <div
                        key={`${program.id}:${course.id}`}
                        className="group/row vtk-list-row vtk-list-row-hover pr-2"
                    >
                        <CourseBadge name={localizedCourseName(course, language ?? i18n.language)} seed={course.code} size={20} />

                        <div className="min-w-0 flex-1">
                            <ApiPrefetchLink
                                href={curriculumHref.course(course)}
                                apiEndpoints={[
                                    `/api/courses/${course.id}`,
                                    `/api/document_categories?lang=${i18n.language}`,
                                ]}
                                onClick={() => {
                                    const leaf = modules.at(-1);
                                    if (leaf) rememberBranch(course.id, leaf.id);
                                }}
                                className="block truncate text-body font-medium text-fg hover:underline"
                            >
                                {localizedCourseName(course, language ?? i18n.language)}
                            </ApiPrefetchLink>

                            {/* The branch, as breadcrumbs rather than a tree to hunt through. */}
                            <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-caption text-fg-muted">
                                <span className="truncate">{shortProgramName(program.name)}</span>
                                {modules.map((node) => (
                                    <span key={node.id} className="flex min-w-0 items-center gap-1">
                                        <ChevronRight size={11} aria-hidden="true" className="shrink-0" />
                                        <span className="truncate">{node.name}</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <span className="hidden w-20 shrink-0 text-small text-fg-muted tabular sm:block">{course.code}</span>
                        <span className="hidden w-14 shrink-0 text-right text-small text-fg-muted tabular sm:block">{course.credits} SP</span>
                        <span className="hidden shrink-0 sm:block">
                            <SemesterIndicator semesters={course.semesters} size={16} />
                        </span>
                        <span className="hidden shrink-0 md:flex -space-x-1.5">
                            {course.professors?.map((unumber, index) => (
                                <ProfessorDiv key={unumber} unumber={unumber} index={index} size={26} linkToProfile={false} />
                            ))}
                        </span>
                        <span className="reveal-on-hover">
                            <DownloadButton courses={[course]} size={16} />
                        </span>
                        <FavoriteButton itemId={course.id} itemType="course" size={16} className="vtk-icon-button" />
                    </div>
                ))}
            </div>
        </div>
    );
}
