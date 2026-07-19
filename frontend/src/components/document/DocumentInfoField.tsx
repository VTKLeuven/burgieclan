import type { LucideIcon } from "lucide-react";

/**
 * Inline component to display an information field consisting of an icon and a value
 * @param Icon
 * @param value
 * @param className
 * @constructor
 */
export default function DocumentInfoField({ icon: Icon, value, className }: {
    icon: LucideIcon;
    value: string;
    className?: string;
}) {
    return (
        <span className={`inline-flex items-center gap-2 text-sm text-vtk-body ${className ?? ''}`}>
            <Icon
                size={15}
                strokeWidth="1.75"
                className="shrink-0 text-vtk-muted"
                aria-hidden="true"
            />
            {value}
        </span>
    );
};