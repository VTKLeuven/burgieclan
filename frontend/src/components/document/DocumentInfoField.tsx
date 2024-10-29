import { LucideIcon } from "lucide-react";
import React from "react";

/**
 * Inline component to display a field with an icon and a value
 */
export default function DocumentInfoField({icon: Icon, value, className}: {
    icon: LucideIcon;
    value: string;
    className?: string;
}) {
    return (
        <span className={`inline-flex items-center space-x-2 ${className}`}>
            <Icon size={18}/>
            <div>{value}</div>
        </span>
    );
};