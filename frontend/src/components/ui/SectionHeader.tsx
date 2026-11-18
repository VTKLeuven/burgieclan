import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * The header above a block of content (Dopl's widget header): an icon, a semibold title, a muted
 * count, and one action on the right. There is no card around the block itself.
 */
export default function SectionHeader({
    icon,
    title,
    count,
    description,
    action,
    id,
    className,
    as: Heading = 'h2',
}: {
    icon?: ReactNode;
    title: ReactNode;
    count?: number;
    description?: ReactNode;
    action?: ReactNode;
    id?: string;
    className?: string;
    as?: 'h2' | 'h3';
}) {
    return (
        <div className={cn('mb-3', className)}>
            <div className="flex min-h-8 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-icon">
                    {icon}
                    <Heading id={id} className="m-0 truncate text-body font-semibold text-fg">
                        {title}
                    </Heading>
                    {count !== undefined && <span className="text-body text-fg-muted tabular">{count}</span>}
                </div>
                {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
            </div>
            {description && <p className="m-0 max-w-[68ch] text-small text-fg-muted">{description}</p>}
        </div>
    );
}
