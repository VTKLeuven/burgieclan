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
 * The programme a course is shown under, as a row of the course page's properties sidebar.
 *
 * A course shared between programmes can be reached through each of them; only the breadcrumb
 * says which branch is shown, and it can only say one. When there are several, the row becomes a
 * small switcher. Nothing navigates: the course is the same either way, only its surroundings
 * differ, so picking one re-points the breadcrumb and stays put.
 */
export default function CoursePlacement() {
    const { t } = useTranslation();
    const { paths, activePath, chooseBranch } = useCurriculumLocation();

    if (!activePath) {
        return null;
    }

    const label = t('course-page.placement.label');
    const current = shortProgramName(activePath.program.name);

    return (
        <div className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-3 py-1.5">
            <dt className="pt-0.5 text-small text-fg-muted">{label}</dt>
            <dd className="m-0 min-w-0 text-body text-fg [overflow-wrap:anywhere]">
                {paths.length < 2 ? (
                    <span title={activePath.program.name}>{current}</span>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger className="-mx-1.5 -my-0.5 flex max-w-full items-start gap-1.5 rounded-[8px] px-1.5 py-0.5 text-left transition-colors hover:bg-neutral-150 data-[state=open]:bg-neutral-150">
                            <span className="min-w-0">
                                <span className="block">{current}</span>
                                <span className="block text-caption text-fg-muted">
                                    {t('course-page.placement.other', { count: paths.length - 1 })}
                                </span>
                            </span>
                            <ChevronsUpDown className="mt-0.5 size-4 shrink-0 text-icon" aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-max max-w-[min(28rem,85vw)]">
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
                )}
            </dd>
        </div>
    );
}
