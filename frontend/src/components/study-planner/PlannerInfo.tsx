'use client';

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { CalendarPlus, CheckCheck, Flag, Info, Link2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function Point({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <li className="flex gap-2.5 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-icon-strong">
            {icon}
            <span>{children}</span>
        </li>
    );
}

/** The ⓘ beside the planner's title: what the planner does, in four lines. */
export default function PlannerInfo() {
    const { t } = useTranslation();

    return (
        <Popover className="flex shrink-0">
            <PopoverButton
                className="vtk-icon-button size-7! data-open:bg-neutral-150 data-open:text-fg"
                aria-label={t('study_planner.info.button')}
                title={t('study_planner.info.button')}
            >
                <Info className="size-4" aria-hidden="true" />
            </PopoverButton>
            <PopoverPanel
                anchor={{ to: 'bottom start', gap: 8 }}
                transition
                className="z-50 w-[min(24rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-4 shadow-popover transition duration-150 ease-out data-closed:-translate-y-1 data-closed:opacity-0"
            >
                <h2 className="m-0 text-body font-semibold text-fg">{t('study_planner.info.title')}</h2>
                <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0 text-small text-fg-secondary">
                    <Point icon={<Link2 aria-hidden="true" />}>{t('study_planner.info.link')}</Point>
                    <Point icon={<CheckCheck aria-hidden="true" />}>{t('study_planner.info.marks')}</Point>
                    <Point icon={<Flag aria-hidden="true" />}>{t('study_planner.info.track')}</Point>
                    <Point icon={<CalendarPlus aria-hidden="true" />}>{t('study_planner.info.subscribe')}</Point>
                </ul>
            </PopoverPanel>
        </Popover>
    );
}
