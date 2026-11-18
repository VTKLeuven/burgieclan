'use client';

import { Breadcrumbs, type Crumb } from '@/components/layout/PageHeader';
import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import { GraduationCap } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { localizedCourseName } from '@/utils/courseName';
import { shortProgramName } from '@/utils/curriculumLabels';

/**
 * Deeper than this and the trail costs more room than it gives back. The programme and the last
 * two groups are what orient a reader; the ones in between are collapsed to an ellipsis that
 * still links back to the programme.
 */
const MAX_MODULES = 2;

/**
 * The trail from the home page down to whatever the reader is looking at, read straight from the
 * curriculum location rather than passed in piecemeal.
 *
 * "Home > Courses > <course>" was the whole trail before, which skipped every part the reader
 * actually navigated through and left them unable to step back to the semester they came from.
 */
export function useCurriculumCrumbs(): Crumb[] {
    const { t, i18n } = useTranslation();
    const { activePath, course, category, document: currentDocument } = useCurriculumLocation();

    const crumbs: Crumb[] = [
        { label: t('courses'), href: curriculumHref.programs(), icon: <GraduationCap /> },
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

    return crumbs;
}

/** The curriculum trail for the page header, read from the curriculum location. */
export default function DynamicBreadcrumb() {
    return <Breadcrumbs crumbs={useCurriculumCrumbs()} />;
}
