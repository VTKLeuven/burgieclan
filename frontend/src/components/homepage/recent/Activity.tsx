import { Clock } from "lucide-react";
import Link from "next/link";
import React from "react";
import { format, register } from 'timeago.js';

register('minimal', (number: number, index: number): [string, string] => {
    const units = ['s', 'm', 'h', 'd', 'w', 'mo', 'y'];
    const value = `${number}${units[Math.floor(index / 2)]}`;
    return [value, value];
});

interface ActivityProps {
    documentName: string;
    courseName: string;
    timestamp: string;
    link: string;
}

export const Activity: React.FC<ActivityProps> = ({
    documentName,
    courseName,
    timestamp,
    link
}) => {
    return (
        <Link className="flex items-start space-x-4 p-2 pl-3 hover:bg-gray-50" href={link}>
            <div className="flex-shrink-0">
                <Clock className="mt-0.5 h-5 w-5 text-gray-500" />
                <p className="text-xs text-gray-400 mt-0.5 text-center">
                    {format(timestamp, 'minimal')}
                </p>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                    {documentName}
                </p>
                <p className="text-sm font-normal text-gray-500">
                    {courseName}
                </p>
            </div>
        </Link>
    )
}