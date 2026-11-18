'use client';

import TableFavoriteAllButton from '@/components/courses/TableFavoriteAllButton';
import type { Course } from '@/types/entities';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface CourseTableHeaderProps {
    courses?: Course[];
}

export const CourseTableHeader: React.FC<CourseTableHeaderProps> = ({ courses }) => {
    const { t } = useTranslation();

    return (
        <div className="flex h-10 items-center gap-3 border-b border-border bg-surface-muted pr-2 pl-3 text-small font-medium text-fg-muted" role="row">
            <div className="flex w-8 shrink-0 justify-center" role="columnheader">
                {courses && courses.length > 0 && <TableFavoriteAllButton courses={courses} />}
            </div>
            <div className="min-w-0 flex-1" role="columnheader">{t('curriculum-navigator.course', { defaultValue: 'Name' })}</div>
            <div className="hidden w-20 shrink-0 sm:block" role="columnheader">Code</div>
            <div className="hidden w-12 shrink-0 text-right sm:block" role="columnheader">{t('curriculum-navigator.credits-short')}</div>
            <div className="hidden w-16 shrink-0 text-center md:block" role="columnheader">{t('curriculum-navigator.semester', { defaultValue: 'Semester' })}</div>
            <div className="hidden w-24 shrink-0 lg:block" role="columnheader">{t('course-page.teachers')}</div>
            <div className="w-8 shrink-0" role="columnheader"><span className="sr-only">Actions</span></div>
        </div>
    );
};
