'use client';

import { useParams } from 'next/navigation';
import CoursePage from '@/components/coursepage/CoursePage';
import { Breadcrumb } from '@/types/entities'
import React from 'react'
import Loading from '@/app/[locale]/loading'

const CoursePageWrapper = () => {
    const { id } = useParams();

    const breadcrumb: Breadcrumb = {
        id: 1,
        breadcrumb: ['Home', 'Courses', `Course ${id}`]
    };

    if (!id) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <Loading />
            </div>
        )
    }

    return (
        <div className="flex h-full w-full items-center justify-center">
            <CoursePage courseId={Number(id)} breadcrumb={breadcrumb} />
        </div>
    );
};

export default CoursePageWrapper;