'use client';

import { useParams } from 'next/navigation';
import CoursePage from '@/components/coursepage/CoursePage';
import {Breadcrumb} from '@/types'
import initTranslations from '@/app/i18n'
import React from 'react'
import Loading from '@/app/[locale]/loading'

const CoursePageWrapper = () => {
    const { locale, id } = useParams();

    const breadcrumb: Breadcrumb = {
        breadcrumb: ['Home', 'Courses', `Course ${id}`]
    };

    if (!id) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <Loading/>
            </div>
        )
    }

    return (
        <div className="flex flex-1 h-full">
            {/* Main Content */}
            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 border-r">
                    <div className="p-4">
                        Sidebar content
                    </div>
                </aside>

                <CoursePage courseId={Number(id)} breadcrumb={breadcrumb} />
            </div>
        </div>
    );
};

export default CoursePageWrapper;