import ApiPrefetchLink from "@/components/ui/ApiPrefetchLink";
import { FileText } from "lucide-react";
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
            className="flex min-h-12 items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-hover"
            href={link}
            apiEndpoints={apiEndpoints}
        >
            <FileText aria-hidden="true" className="size-4 shrink-0 text-icon" />
            <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{documentName}</span>
            <span className="hidden max-w-[45%] shrink truncate text-small text-fg-muted sm:block">{courseName}</span>
            {/* Compact relative time (e.g. "2h", "3d") right-aligned as a spec value. */}
            <span className="w-10 shrink-0 text-right text-small text-fg-muted tabular">
                {format(timestamp, 'minimal')}
            </span>
        </ApiPrefetchLink>
    );
};