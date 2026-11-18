'use client';

import CourseBadge from '@/components/layout/CourseBadge';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import FavoriteButton from '@/components/ui/FavoriteButton';
import SectionHeader from '@/components/ui/SectionHeader';
import { useUser } from '@/components/UserContext';
import { localizedCourseName } from '@/utils/courseName';
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

/**
 * The reader's starred courses on Home, each one click from its page. With none starred yet it
 * explains how to get them here instead of showing an empty box.
 */
export default function MyCourses() {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const courses = user?.favoriteCourses ?? [];

    return (
        <section aria-labelledby="my-courses-heading">
            <SectionHeader
                id="my-courses-heading"
                icon={<BookOpen />}
                title={t('shell.my_courses')}
                count={courses.length}
                action={
                    <Link href="/courses" className="flex items-center gap-1 text-small font-medium text-fg-muted hover:text-fg">
                        {t('home.all_courses')}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                }
            />
            {courses.length === 0 ? (
                <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-border-strong px-4 py-5 sm:flex-row sm:items-center">
                    <p className="m-0 flex-1 text-body text-fg-muted">{t('home.no_courses_yet')}</p>
                    <Link href="/courses" className="vtk-button vtk-button-sm">
                        {t('home.find_courses')}
                    </Link>
                </div>
            ) : (
                <div className="vtk-list">
                    {courses.map((course) => {
                        const name = localizedCourseName(course, i18n.language) ?? course.code ?? '';
                        return (
                            <div key={course.id} className="group/row vtk-list-row vtk-list-row-hover py-0 pr-2">
                                <ApiPrefetchLink
                                    href={`/course/${course.id}`}
                                    apiEndpoints={[`/api/courses/${course.id}`, `/api/document_categories?lang=${i18n.language}`]}
                                    className="flex min-h-12 min-w-0 flex-1 items-center gap-3"
                                >
                                    <CourseBadge name={name} seed={course.code} size={20} />
                                    <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{name}</span>
                                    <span className="hidden shrink-0 text-small text-fg-muted tabular sm:inline">{course.code}</span>
                                </ApiPrefetchLink>
                                <FavoriteButton itemId={course.id} itemType="course" size={16} className="vtk-icon-button reveal-on-hover" />
                                <ChevronRight className="size-4 shrink-0 text-fg-placeholder" aria-hidden="true" />
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
