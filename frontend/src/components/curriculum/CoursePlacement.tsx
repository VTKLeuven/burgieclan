'use client';

import { useCurriculumLocation } from '@/components/curriculum/CurriculumLocationContext';
import { shortProgramName } from '@/utils/curriculumLabels';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * A quiet switch between the programmes a shared course is taught in.
 *
 * Only the breadcrumb says which branch is being shown, and it can only say one. Rather than
 * spelling every placement out in a block of its own - which took a third of the page above the
 * fold and repeated what the breadcrumb had already said - this is one line in the fact row that
 * opens on demand. Nothing navigates: the course is the same either way, only its surroundings
 * differ, so picking one re-points the breadcrumb and the folder tree and stays put.
 */
export default function CoursePlacement() {
    const { t } = useTranslation();
    const { paths, activePath, chooseBranch } = useCurriculumLocation();
    const [open, setOpen] = useState(false);

    // With one placement the breadcrumb already says everything there is to say.
    if (paths.length < 2) {
        return null;
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                aria-expanded={open}
                className="vtk-link flex items-center gap-1.5 text-sm"
            >
                {t('course-page.placement.other', { count: paths.length - 1 })}
                <ChevronDown size={13} aria-hidden="true" className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {open && (
                <div className="absolute left-0 top-full z-20 mt-2 w-max max-w-[min(32rem,80vw)] overflow-hidden rounded-[14px] border border-vtk-line bg-vtk-surface shadow-[0_18px_42px_rgba(10,15,31,0.12)]">
                    {paths.map((path) => {
                        const leaf = path.modules.at(-1);
                        const isActive = path === activePath;

                        return (
                            <button
                                key={`${path.program.id}:${leaf?.id}`}
                                type="button"
                                onClick={() => {
                                    if (leaf) chooseBranch(leaf.id);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-vtk-paper-2 ${isActive ? 'text-vtk-ink' : 'text-vtk-body'
                                    }`}
                            >
                                <Check
                                    size={14}
                                    className={`mt-0.5 shrink-0 ${isActive ? 'text-vtk-navy' : 'invisible'}`}
                                    aria-hidden="true"
                                />
                                <span className="min-w-0">
                                    <span className="block font-medium">{shortProgramName(path.program.name)}</span>
                                    <span className="block text-xs text-vtk-muted">
                                        {path.modules.map((node) => node.name).join(' › ')}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
