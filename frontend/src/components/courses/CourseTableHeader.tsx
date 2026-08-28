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
        <div className="grid grid-cols-12 bg-vtk-paper-2 py-2 px-3 text-sm font-medium border-b leading-tight" role="row">
            <div className="col-span-5 flex items-center" role="columnheader">
                {courses && courses.length > 0 && (
                    <TableFavoriteAllButton courses={courses} />
                )}
                <span>{t('curriculum-navigator.course', { defaultValue: 'Name' })}</span>
            </div>
            <div className="col-span-1" role="columnheader">Code</div>
            <div className="col-span-1 text-center" role="columnheader">{t('curriculum-navigator.credits', { defaultValue: 'Credits' })}</div>
            <div className="col-span-2 text-center" role="columnheader">{t('curriculum-navigator.semester', { defaultValue: 'Semester' })}</div>
            <div className="col-span-2 text-center" role="columnheader">Professors</div>
            <div className="col-span-1 text-right" role="columnheader"><span className="sr-only">Actions</span></div>
        </div>
    );
};