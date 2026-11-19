'use client';

import PageHeader, { type Crumb } from '@/components/layout/PageHeader';
import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import { GraduationCap } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useTranslation } from "react-i18next";
import { courseTitle } from '@/utils/courseName';
import { shortProgramName } from '@/utils/curriculumLabels';

/**
 * Deeper than this and the trail costs more room than it gives back. The programme and the last
 * two groups are what orient a reader; the ones in between are collapsed to an ellipsis that
 * still links back to the programme.
 */
const MAX_MODULES = 2;

/**
 * The trail from the programme down to whatever the reader is looking at, read straight from the
 * curriculum location rather than passed in piecemeal.
 *
 * It starts at the programme: "Courses" in front of it took room on every curriculum page and
 * the sidebar already links there. Only when the programme is unknown does it stand in.
 */
export function useCurriculumCrumbs(): Crumb[] {
    const { t, i18n } = useTranslation();
    const { activePath, course, category, document: currentDocument } = useCurriculumLocation();

    const crumbs: Crumb[] = [];

    if (activePath) {
        crumbs.push({
            label: shortProgramName(activePath.program.name),
            title: activePath.program.name,
            href: curriculumHref.program(activePath.program),
            icon: <GraduationCap />,
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
            label: courseTitle(course) || `Course ${course.id}`,
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

    if (!activePath) {
        crumbs.unshift({ label: t('courses'), href: curriculumHref.programs(), icon: <GraduationCap /> });
    }

    return crumbs;
}

/** The page header of a curriculum page, with the trail read from the curriculum location. */
export default function CurriculumPageHeader(props: Omit<ComponentProps<typeof PageHeader>, 'crumbs' | 'breadcrumb'>) {
    return <PageHeader {...props} crumbs={useCurriculumCrumbs()} />;
}
