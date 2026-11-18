'use client';

import { CourseRow } from '@/components/courses/CourseRow';
import { CourseTableHeader } from '@/components/courses/CourseTableHeader';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import type { Course, Module } from '@/types/entities';
import SectionHeader from '@/components/ui/SectionHeader';
import { BookOpen, ChevronRight, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CurriculumLevelProps {
    /** The groups sitting under this node, drawn as links to their own page. */
    modules?: Module[];
    /** The courses this node teaches itself, drawn as the familiar table. */
    courses?: Course[];
    /** The module the courses hang under, so a course page knows which branch it was opened from. */
    moduleId?: number;
}

/**
 * One level of the curriculum as a page: the groups below it, then the courses it teaches.
 *
 * A group is a link, not a disclosure. Opening a programme used to expand it in place and push
 * everything else down the page, so four levels deep the reader was scrolling one enormous
 * accordion and the back button dropped them back at the top of a collapsed tree. A page per
 * level gives the browser's own history something to restore.
 */
export default function CurriculumLevel({ modules, courses, moduleId }: CurriculumLevelProps) {
    const { t } = useTranslation();

    const hasModules = !!modules && modules.length > 0;
    const hasCourses = !!courses && courses.length > 0;

    if (!hasModules && !hasCourses) {
        return <div className="vtk-panel vtk-empty mt-6">{t('curriculum-navigator.no-courses-in-module')}</div>;
    }

    return (
        <div className="mt-6 grid gap-8">
            {hasModules && (
                <section aria-labelledby="groups-heading">
                    <SectionHeader id="groups-heading" icon={<Folder />} title={t('curriculum-navigator.groups')} count={modules.length} />
                    <div className="vtk-list">
                        {modules.map((node) => (
                            <div key={node.id} className="group/row vtk-list-row vtk-list-row-hover py-0 pr-2">
                                <ApiPrefetchLink
                                    href={curriculumHref.module(node)}
                                    apiEndpoints={`/api/modules/${node.id}`}
                                    className="flex min-h-12 min-w-0 flex-1 items-center gap-3"
                                >
                                    <Folder className="size-4 shrink-0 text-icon" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{node.name}</span>
                                    {(node.courses?.length ?? 0) > 0 && (
                                        <span className="shrink-0 text-small text-fg-muted tabular">
                                            {t('curriculum-navigator.meta-courses-count', { count: node.courses!.length })}
                                        </span>
                                    )}
                                </ApiPrefetchLink>
                                <span className="reveal-on-hover">
                                    <DownloadButton modules={[node]} />
                                </span>
                                <FavoriteButton itemId={node.id} itemType="module" size={16} className="vtk-icon-button" />
                                <ChevronRight className="size-4 shrink-0 text-fg-placeholder" aria-hidden="true" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {hasCourses && (
                <section aria-labelledby="courses-heading">
                    <SectionHeader id="courses-heading" icon={<BookOpen />} title={t('courses')} count={courses.length} />
                    <div className="overflow-hidden rounded-card border border-border bg-surface" role="table">
                        <CourseTableHeader courses={courses} />
                        <div className="vtk-rows" role="rowgroup">
                            {courses.map((course, index) => (
                                <CourseRow
                                    key={course.id}
                                    course={course}
                                    isFirstRow={index === 0}
                                    moduleId={moduleId}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
