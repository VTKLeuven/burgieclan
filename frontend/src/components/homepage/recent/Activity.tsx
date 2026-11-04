import ApiPrefetchLink from "@/components/ui/ApiPrefetchLink";
import { ArrowUpRight, FileText } from "lucide-react";
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

/**
 * One recently opened document, drawn as the wireframes' document row: a grey thumbnail, the
 * course as a small kicker above the title, and the round yellow arrow that opens it.
 */
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
            className="group flex items-center gap-3.5 rounded-md px-3 py-2 transition-colors hover:bg-vtk-paper"
            href={link}
            apiEndpoints={apiEndpoints}
        >
            <span className="vtk-thumb" aria-hidden="true">
                <FileText size={18} strokeWidth={1.5} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[11px] leading-snug text-vtk-muted">
                    {courseName}
                </p>
                <p className="m-0 truncate text-sm leading-snug text-vtk-body">
                    {documentName}
                </p>
            </div>
            {/* Compact relative time (e.g. "2h", "3d"), then the arrow that opens the document. */}
            <span className="shrink-0 text-xs tabular-nums text-vtk-muted">
                {format(timestamp, 'minimal')}
            </span>
            <span className="vtk-arrow-button" aria-hidden="true">
                <ArrowUpRight size={16} strokeWidth={2} />
            </span>
        </ApiPrefetchLink>
    );
};
