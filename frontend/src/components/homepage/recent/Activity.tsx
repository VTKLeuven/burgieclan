import ApiPrefetchLink from "@/components/ui/ApiPrefetchLink";
import { Clock } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { format, register } from 'timeago.js';

// Register a custom 'minimal' locale for timeago.js that displays compact time units
register('minimal', (number: number, index: number): [string, string] => {
    // Define short unit abbreviations: seconds, minutes, hours, days, weeks, months, years
    const units = ['s', 'm', 'h', 'd', 'w', 'mo', 'y'];
    // Convert timeago index to unit abbreviation (index/2 maps to correct unit)
    const value = `${number}${units[Math.floor(index / 2)]}`;
    return [value, value];
});

interface ActivityProps {
    documentId?: number;
    documentName: string;
    courseName: string;
    timestamp: string;
    link: string;
}

export const Activity: React.FC<ActivityProps> = ({
    documentId,
    documentName,
    courseName,
    timestamp,
    link
}) => {
    const { i18n } = useTranslation();
    const apiEndpoints = documentId ? [
        `/api/documents/${documentId}?lang=${i18n.language}`,
        `/api/document_comments?document=/api/documents/${documentId}`,
    ] : undefined;

    return (
        <ApiPrefetchLink
            className="flex items-center gap-3.5 px-5 py-2.5 transition-colors hover:bg-vtk-paper-2"
            href={link}
            apiEndpoints={apiEndpoints}
        >
            <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-vtk-muted" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-snug text-vtk-ink">
                    {documentName}
                </p>
                <p className="truncate text-[13px] leading-snug text-vtk-muted">
                    {courseName}
                </p>
            </div>
            {/* Compact relative time (e.g. "2h", "3d") right-aligned as a spec value. */}
            <span className="shrink-0 text-xs tabular-nums text-vtk-muted">
                {format(timestamp, 'minimal')}
            </span>
        </ApiPrefetchLink>
    );
};