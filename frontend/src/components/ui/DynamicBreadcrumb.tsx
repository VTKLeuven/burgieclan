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
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { localizedCourseName } from '@/utils/courseName';
import { shortProgramName } from '@/utils/curriculumLabels';

/**
 * Deeper than this and the trail costs more room than it gives back. The programme and the last
 * two groups are what orient a reader; the ones in between are collapsed to an ellipsis that
 * still links back to the programme.
 */
const MAX_MODULES = 3;

interface Crumb {
    label: string;
    title?: string;
    href: string;
    current?: boolean;
}

/**
 * The trail from the home page down to whatever the reader is looking at, read straight from the
 * curriculum location rather than passed in piecemeal.
 *
 * "Home > Courses > <course>" was the whole trail before, which skipped every part the reader
 * actually navigated through and left them unable to step back to the semester they came from.
 */
export default function DynamicBreadcrumb() {
    const { t, i18n } = useTranslation();
    const { activePath, course, category, document: currentDocument } = useCurriculumLocation();

    const crumbs: Crumb[] = [
        { label: t('home.title'), href: '/' },
        { label: t('courses'), href: curriculumHref.programs() },
    ];

    if (activePath) {
        crumbs.push({
            label: shortProgramName(activePath.program.name),
            title: activePath.program.name,
            href: curriculumHref.program(activePath.program),
        });

        const modules = activePath.modules;
        const shown = modules.length > MAX_MODULES ? modules.slice(-MAX_MODULES) : modules;

        if (shown.length < modules.length) {
            crumbs.push({
                label: '…',
                title: modules.slice(0, modules.length - shown.length).map((node) => node.name).join(' › '),
                href: curriculumHref.program(activePath.program),
            });
        }

        shown.forEach((node) => {
            crumbs.push({ label: node.name ?? '', href: curriculumHref.module(node) });
        });
    }

    if (course) {
        crumbs.push({
            label: localizedCourseName(course, i18n.language) || `Course ${course.id}`,
            href: curriculumHref.course(course),
        });
    }

    if (category && course) {
        crumbs.push({
            label: category.name || `Category ${category.id}`,
            href: `/course/${course.id}/documents/category/${category.id}`,
        });
    }

    if (currentDocument) {
        crumbs.push({
            label: currentDocument.name || currentDocument.filename || `Document ${currentDocument.id}`,
            href: `/document/${currentDocument.id}`,
        });
    }

    crumbs[crumbs.length - 1].current = true;

    return (
        <Breadcrumb>
            {/* One line that scrolls sideways under pressure rather than wrapping to two: a
                two-line kicker pushes the page title down and reads as a paragraph. */}
            <BreadcrumbList className="flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {crumbs.map((crumb, index) => (
                    <Fragment key={`${crumb.href}:${index}`}>
                        <BreadcrumbItem className="shrink-0">
                            {crumb.current ? (
                                <BreadcrumbPage className="block max-w-[20rem] truncate">{crumb.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link
                                        href={crumb.href}
                                        title={crumb.title ?? crumb.label}
                                        className="block max-w-[13rem] truncate"
                                    >
                                        {crumb.label}
                                    </Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {index < crumbs.length - 1 && <BreadcrumbSeparator className="shrink-0" />}
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
