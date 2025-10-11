'use client';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Course, Document, DocumentCategory } from "@/types/entities";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface DynamicBreadcrumbProps {
    course?: Course;
    category?: DocumentCategory;
    document?: Document;
}

export default function DynamicBreadcrumb({ course, category, document }: DynamicBreadcrumbProps) {
    const { t } = useTranslation();

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

    // Add Course if available
    if (course) {
        breadcrumbItems.push({
            label: course.name || `Course ${course.id}`,
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
                    <div key={index} className="flex items-center">
                        <BreadcrumbItem>
                            {item.isCurrentPage ? (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link href={item.href}>{item.label}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                    </div>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
