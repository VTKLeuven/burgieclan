'use client';

import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import type { Course } from '@/types/entities';
import { courseTitle } from '@/utils/courseName';
import { ArrowLeft, ArrowRight, ChevronRight, Equal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Kind = 'documents' | 'evaluations';

const RELATIONS = [
    { key: 'predecessors', icon: ArrowLeft, of: (course: Course) => course.oldCourses },
    { key: 'successors', icon: ArrowRight, of: (course: Course) => course.newCourses },
    { key: 'equivalents', icon: Equal, of: (course: Course) => course.identicalCourses },
] as const;

/**
 * Points, inside the documents or the subject-evaluation section, at the same subject under
 * another code that holds some of its own: after a curriculum reform the material usually lives
 * on the former course, and a student on the new code would otherwise take an empty section for
 * the whole story. The material itself stays on the course it was written for.
 */
export default function RelatedMaterial({ course, kind }: { course: Course; kind: Kind }) {
    const { t, i18n } = useTranslation();

    const rows = RELATIONS.flatMap(({ key, icon, of }) =>
        (of(course) ?? [])
            .map((related) => ({
                key,
                icon,
                related,
                count: (kind === 'documents' ? related.documentCount : related.commentCount) ?? 0,
            }))
            .filter((row) => row.count > 0),
    );

    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="mb-3 overflow-hidden rounded-card border border-border bg-surface-muted">
            <p className="m-0 px-4 pt-2.5 pb-1 text-caption font-medium text-fg-muted">
                {t(`course-page.related.more_${kind}`)}
            </p>
            <ul className="m-0 list-none p-0 pb-1">
                {rows.map(({ key, icon: Icon, related, count }) => (
                    <li key={`${key}:${related.id}`}>
                        <ApiPrefetchLink
                            href={`/course/${related.id}${kind === 'evaluations' ? '#evaluation-heading' : ''}`}
                            apiEndpoints={[
                                `/api/courses/${related.id}`,
                                `/api/document_categories?lang=${i18n.language}`,
                            ]}
                            className="group flex min-h-10 items-center gap-3 px-4 py-1.5 text-small transition-colors hover:bg-surface-hover"
                        >
                            <Icon className="size-3.5 shrink-0 text-icon" aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate">
                                <span className="text-fg-muted">{t(`course-page.related.${key}`)} </span>
                                <span className="tabular text-fg-muted">{related.code}</span>
                                {courseTitle(related) && (
                                    <span className="ml-1.5 font-medium text-fg group-hover:underline">{courseTitle(related)}</span>
                                )}
                            </span>
                            <span className="shrink-0 text-fg-secondary tabular">
                                {t(`course-page.related.${kind}`, { count })}
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-icon" aria-hidden="true" />
                        </ApiPrefetchLink>
                    </li>
                ))}
            </ul>
        </div>
    );
}
