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
        <span className={`inline-flex items-center space-x-2 ${className}`}>
            <Icon
                size={18}
                strokeWidth="1.5"
            />
            <div>{value}</div>
        </span>
    );
};