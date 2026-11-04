'use client';

import { CourseRow } from '@/components/courses/CourseRow';
import { CourseTableHeader } from '@/components/courses/CourseTableHeader';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import CurriculumLegend from '@/components/curriculum/CurriculumLegend';
import CurriculumLinkRow from '@/components/curriculum/CurriculumLinkRow';
import DownloadButton from '@/components/ui/DownloadButton';
import type { Course, Module } from '@/types/entities';
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
        <div className="mt-6 grid gap-10">
            {hasModules && (
                <section>
                    <h2 className="vtk-label m-0 mb-1">{t('curriculum-navigator.groups')}</h2>
                    <div>
                        {modules.map((node) => (
                            <CurriculumLinkRow
                                key={node.id}
                                href={curriculumHref.module(node)}
                                apiEndpoints={`/api/modules/${node.id}`}
                                name={node.name}
                                title={node.name}
                                favorite={{ id: node.id, type: 'module' }}
                                actions={<DownloadButton modules={[node]} />}
                            />
                        ))}
                    </div>
                </section>
            )}

            {hasCourses && (
                <section>
                    <h2 className="sr-only">{t('courses')}</h2>
                    <div role="table" aria-label={t('courses')}>
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
                    <CurriculumLegend />
                </section>
            )}
        </div>
    );
}
