'use client';

import { Fragment } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import type { Course, Document, DocumentCategory } from "@/types/entities";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { localizedCourseName } from '@/utils/courseName';

interface DynamicBreadcrumbProps {
    course?: Course;
    category?: DocumentCategory;
    document?: Document;
}

export default function DynamicBreadcrumb({ course, category, document }: DynamicBreadcrumbProps) {
    const { t, i18n } = useTranslation();
    // The programme and modules the course hangs under, resolved once per page in the layout.
    // "Home > Courses > Course" told a reader nothing about which of three programmes they
    // were in, or which semester the course sits in - the parts they navigated through.
    const { activePath } = useCurriculumLocation();

    const breadcrumbItems = [];

    // Always start with Home
    breadcrumbItems.push({
        label: t('home.title'),
        href: '/',
        isCurrentPage: false
    });

    // Add Courses
    breadcrumbItems.push({
        label: t('courses'),
        href: '/courses',
        isCurrentPage: !course && !category && !document
    });

    // The curriculum branch: programme, then the chain of modules down to the course. Both
    // link back into the navigator opened on that node, which is where a reader who wants
    // "the other courses in this semester" is heading.
    if (course && activePath) {
        breadcrumbItems.push({
            label: activePath.program.name ?? '',
            href: `/courses?program=${activePath.program.id}`,
            isCurrentPage: false
        });

        activePath.modules.forEach((node) => {
            breadcrumbItems.push({
                label: node.name ?? '',
                href: `/courses?module=${node.id}`,
                isCurrentPage: false
            });
        });
    }

    // Add Course if available
    if (course) {
        breadcrumbItems.push({
            label: localizedCourseName(course, i18n.language) || `Course ${course.id}`,
            href: `/course/${course.id}`,
            isCurrentPage: !category && !document
        });
    }

    // Add Category if available
    if (category && course) {
        breadcrumbItems.push({
            label: category.name || `Category ${category.id}`,
            href: `/course/${course.id}/documents/category/${category.id}`,
            isCurrentPage: !document
        });
    }

    // Add Document if available
    if (document) {
        breadcrumbItems.push({
            label: document.name || document.filename || `Document ${document.id}`,
            href: `/document/${document.id}`,
            isCurrentPage: true
        });
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {breadcrumbItems.map((item, index) => (
                    <Fragment key={index}>
                        <BreadcrumbItem>
                            {item.isCurrentPage ? (
                                <BreadcrumbPage className="max-w-[22rem] truncate">{item.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    {/* A full branch can name a programme, two modules and a course.
                                        Each part truncates rather than the row scrolling, and the list
                                        wraps, so a long trail costs a second line and never the layout. */}
                                    <Link href={item.href} className="block max-w-[16rem] truncate">{item.label}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
