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
        <div className="grid grid-cols-12 items-end gap-x-3 border-b border-vtk-line-2 px-1 pb-2 text-[13px] leading-tight text-vtk-muted" role="row">
            <div className="col-span-5 flex items-center gap-1" role="columnheader">
                {courses && courses.length > 0 && (
                    <TableFavoriteAllButton courses={courses} />
                )}
                <span>{t('curriculum-navigator.course', { defaultValue: 'Name' })}</span>
            </div>
            <div className="col-span-1" role="columnheader">Code</div>
            <div className="col-span-1 text-center" role="columnheader">{t('curriculum-navigator.credits', { defaultValue: 'Credits' })}</div>
            <div className="col-span-1 text-center" role="columnheader">{t('curriculum-navigator.semester', { defaultValue: 'Semester' })}</div>
            <div className="col-span-2 text-center" role="columnheader">{t('course-page.teachers')}</div>
            <div className="col-span-2 text-right" role="columnheader"><span className="sr-only">Actions</span></div>
        </div>
    );
};
