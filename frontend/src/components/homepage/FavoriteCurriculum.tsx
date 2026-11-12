'use client';

import { useUser } from '@/components/UserContext';
import { curriculumHref } from '@/components/curriculum/curriculumLinks';
import FavoriteButton from '@/components/ui/FavoriteButton';
import ApiPrefetchLink from '@/components/ui/ApiPrefetchLink';
import SectionHeader from '@/components/ui/SectionHeader';
import { shortProgramName } from '@/utils/curriculumLabels';
import { ArrowRight, GraduationCap, Layers, Star } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Matches the recent-activity list next to it, so the two panels read as one column. */
const MAX_PER_TYPE = 4;

interface FavoriteRowProps {
    id: number;
    name: string;
    typeLabel: string;
    type: 'module' | 'program';
    icon: LucideIcon;
}

const FavoriteRow = ({ id, name, typeLabel, type, icon: Icon }: FavoriteRowProps) => (
    // The star has to sit outside the link — a button nested in an anchor is invalid markup —
    // so it is overlaid on the row instead, the same way the sidebar favourites do it.
    <div className="group relative">
        <ApiPrefetchLink
            className="flex min-h-12 items-center gap-3 px-4 py-2 pr-12 transition-colors hover:bg-surface-hover"
            href={type === 'program' ? curriculumHref.program({ id }) : curriculumHref.module({ id })}
            apiEndpoints={type === 'program' ? `/api/programs/${id}` : `/api/modules/${id}`}
        >
            <Icon aria-hidden="true" className="size-4 shrink-0 text-icon" />
            <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{name}</span>
            <span className="shrink-0 text-small text-fg-muted">{typeLabel}</span>
        </ApiPrefetchLink>
        <div className="absolute inset-y-0 right-2 flex items-center">
            <FavoriteButton itemId={id} itemType={type} size={16} className="vtk-icon-button" />
        </div>
    </div>
);

/**
 * Favourite programmes and modules, under the recent-activity panel. Neither has a detail page of
 * its own, so both rows deep-link into the curriculum navigator, which opens them in place.
 */
export const FavoriteCurriculum = () => {
    const { t } = useTranslation();
    const { user } = useUser();

    const programs = user?.favoritePrograms ?? [];
    const modules = user?.favoriteModules ?? [];

    // Nothing starred yet: stay out of the way rather than show two empty lists.
    if (programs.length === 0 && modules.length === 0) {
        return null;
    }

    const truncated = programs.length > MAX_PER_TYPE || modules.length > MAX_PER_TYPE;

    return (
        <section aria-labelledby="favorite-curriculum-heading">
            <SectionHeader
                id="favorite-curriculum-heading"
                icon={<Star className="fill-star text-star!" />}
                title={t('home.favorite_curriculum')}
                count={programs.length + modules.length}
                action={truncated && (
                    <Link href="/account" className="flex items-center gap-1 text-small font-medium text-fg-muted hover:text-fg">
                        {t('home.favorite_curriculum_all')}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                )}
            />
            <div className="vtk-list">
                {programs.slice(0, MAX_PER_TYPE).map(program => (
                    <FavoriteRow
                        key={`program-${program.id}`}
                        id={program.id}
                        name={shortProgramName(program.name)}
                        typeLabel={t('home.favorite_program_label')}
                        type="program"
                        icon={GraduationCap}
                    />
                ))}
                {modules.slice(0, MAX_PER_TYPE).map(module => (
                    <FavoriteRow
                        key={`module-${module.id}`}
                        id={module.id}
                        name={module.name ?? ''}
                        typeLabel={t('home.favorite_module_label')}
                        type="module"
                        icon={Layers}
                    />
                ))}
            </div>
        </section>
    );
};
