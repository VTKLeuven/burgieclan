'use client';

import type { Course } from '@/types/entities';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import { localizedCourseName } from '@/utils/courseName';
import { ArrowLeft, ArrowRight, Equal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RelatedCoursesProps {
    course: Course;
}

/**
 * Links a course to the other codes the same subject has been taught under.
 *
 * Curriculum reforms rename, split and merge courses, so a student on H0R12A
 * Transportverschijnselen is one click from the Fluïdummechanica and
 * Warmteoverdracht archives rather than seeing an almost empty page. The
 * documents themselves deliberately stay on the course they were written for -
 * merging them into one list buries the 21 current documents under 1300
 * historical ones.
 *
 * Both directions are rendered: oldCourses is the owning side of a directional
 * relation, so a predecessor page only knows its successor through newCourses.
 */
export default function RelatedCourses({ course }: RelatedCoursesProps) {
    const { t, i18n } = useTranslation();

    const groups = [
        { key: 'predecessors', icon: ArrowLeft, courses: course.oldCourses ?? [] },
        { key: 'successors', icon: ArrowRight, courses: course.newCourses ?? [] },
        { key: 'equivalents', icon: Equal, courses: course.identicalCourses ?? [] },
    ].filter((group) => group.courses.length > 0);

    if (groups.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 flex flex-col gap-3">
            {groups.map(({ key, icon: Icon, courses }) => (
                <div key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="vtk-label flex items-center gap-1.5 text-vtk-muted">
                        <Icon size={14} aria-hidden="true" />
                        {t(`course-page.related.${key}`)}
                    </span>
                    {courses.map((related) => (
                        <ApiPrefetchLink
                            key={related.id}
                            href={`/course/${related.id}`}
                            apiEndpoints={[
                                `/api/courses/${related.id}`,
                                `/api/document_categories?lang=${i18n.language}`,
                            ]}
                            // Tailwind utilities win over the vtk-* component layer, so the
                            // hover colours override vtk-badge-muted without a custom variant
                            // (component-layer classes get no hover: variant of their own).
                            // Yellow is the accent for an active/selected badge, so hover
                            // lifts the surface and darkens the text instead - the same
                            // treatment the rest of the app uses for a hovered control.
                            className="vtk-badge vtk-badge-muted transition-colors hover:border-vtk-line-2 hover:bg-vtk-surface hover:text-vtk-ink focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy focus-visible:ring-offset-1"
                        >
                            <span className="font-mono">{related.code}</span>
                            {/* The name is absent when the API returned the course as a bare
                                IRI reference; the code alone still identifies it. */}
                            {localizedCourseName(related, i18n.language) && (
                                <span className="ml-1.5">{localizedCourseName(related, i18n.language)}</span>
                            )}
                            {/* How much is actually over there. A reform leaves the new code
                                nearly empty while the old one holds a decade of exams, and
                                without a number the link reads as a footnote rather than as
                                the place the material still lives. */}
                            {related.documentCount !== undefined && related.documentCount > 0 && (
                                <span className="ml-1.5 text-vtk-muted">
                                    {t('course-page.related.documents', { count: related.documentCount })}
                                </span>
                            )}
                        </ApiPrefetchLink>
                    ))}
                </div>
            ))}
        </div>
    );
}
