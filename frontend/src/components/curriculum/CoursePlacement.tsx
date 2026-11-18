'use client';

import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { shortProgramName } from '@/utils/curriculumLabels';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The programme a course is shown under, on the line of facts below the course title.
 *
 * A course shared between programmes can be reached through each of them; only the breadcrumb
 * says which branch is shown, and it can only say one. When there are several, the programme
 * becomes a small switcher. Nothing navigates: the course is the same either way, only its
 * surroundings differ, so picking one re-points the breadcrumb and the curriculum tree and stays put.
 */
export default function CoursePlacement() {
    const { t } = useTranslation();
    const { paths, activePath, chooseBranch } = useCurriculumLocation();

    if (!activePath) {
        return null;
    }

    const label = t('course-page.placement.label');
    const current = shortProgramName(activePath.program.name);

    if (paths.length < 2) {
        return <span title={activePath.program.name}>{current}</span>;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="-mx-1.5 -my-0.5 inline-flex max-w-full items-center gap-1.5 rounded-[8px] px-1.5 py-0.5 text-left transition-colors hover:bg-neutral-150 hover:text-fg data-[state=open]:bg-neutral-150"
                aria-label={`${label}: ${current}`}
            >
                <span className="min-w-0 truncate">{current}</span>
                <span className="shrink-0 text-fg-muted">
                    {t('course-page.placement.other-short', { count: paths.length - 1 })}
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-icon" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-max max-w-[min(28rem,85vw)]">
                <DropdownMenuLabel>{label}</DropdownMenuLabel>
                {paths.map((path) => {
                    const leaf = path.modules.at(-1);
                    const isActive = path === activePath;

                    return (
                        <DropdownMenuItem
                            key={`${path.program.id}:${leaf?.id}`}
                            onSelect={() => { if (leaf) chooseBranch(leaf.id); }}
                            className="items-start"
                        >
                            <Check className={isActive ? 'mt-0.5' : 'invisible mt-0.5'} aria-hidden="true" />
                            <span className="min-w-0">
                                <span className="block font-medium">{shortProgramName(path.program.name)}</span>
                                <span className="block text-caption text-fg-muted">
                                    {path.modules.map((node) => node.name).join(' › ')}
                                </span>
                            </span>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
