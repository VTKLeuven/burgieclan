'use client';

import { CourseRow } from '@/components/courses/CourseRow';
import { CourseTableHeader } from '@/components/courses/CourseTableHeader';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import DownloadButton from '@/components/ui/DownloadButton';
import FavoriteButton from '@/components/ui/FavoriteButton';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import type { Course, Module } from '@/types/entities';
import { ChevronRight, Folder } from 'lucide-react';
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
        return <p className="vtk-empty mt-6">{t('curriculum-navigator.no-courses-in-module')}</p>;
    }

    return (
        <div className="mt-6 grid gap-8">
            {hasModules && (
                <section>
                    <h2 className="vtk-label mb-3 text-vtk-muted">{t('curriculum-navigator.groups')}</h2>
                    <div className="grid gap-2">
                        {modules.map((node) => (
                            <div
                                key={node.id}
                                className="flex items-center gap-2 rounded-[14px] border border-vtk-line bg-vtk-surface px-4 transition-colors hover:border-vtk-line-2 hover:bg-vtk-paper"
                            >
                                <ApiPrefetchLink
                                    href={curriculumHref.module(node)}
                                    apiEndpoints={`/api/modules/${node.id}`}
                                    className="flex min-w-0 flex-1 items-center gap-3 py-3 text-[15px] font-medium text-vtk-ink rounded focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy"
                                >
                                    <Folder size={16} className="shrink-0 text-vtk-muted" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">{node.name}</span>
                                    <ChevronRight size={16} className="shrink-0 text-vtk-muted" aria-hidden="true" />
                                </ApiPrefetchLink>
                                <FavoriteButton itemId={node.id} itemType="module" size={16} className="shrink-0" />
                                <DownloadButton modules={[node]} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {hasCourses && (
                <section>
                    <h2 className="vtk-label mb-3 text-vtk-muted">{t('courses')}</h2>
                    <div className="overflow-hidden rounded-[14px] border border-vtk-line bg-vtk-surface" role="table">
                        <CourseTableHeader courses={courses} />
                        {courses.map((course, index) => (
                            <CourseRow
                                key={course.id}
                                course={course}
                                isFirstRow={index === 0}
                                moduleId={moduleId}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
