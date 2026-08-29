import React from 'react';
import { Circle } from 'lucide-react';

interface SemesterIndicatorProps {
    semesters?: string[] | string;
    size?: number;
}

/**
 * Half circle = taught in that semester, full circle = year course, nothing = unknown.
 *
 * The "nothing" case matters: courses whose KU Leuven offerPeriod is neither 1, 2 nor 3 (notably
 * the ones marked "not offered") arrive with an empty semesters array. The previous version tested
 * `!Array.isArray(semesters)` first, so an empty array fell through to the SVG and, because
 * `includes("Semester 1")` was false, took the mirrored transform — drawing the Semester 2 icon for
 * every course with no semester data at all.
 */
const SemesterIndicator: React.FC<SemesterIndicatorProps> = ({
    semesters,
    size = 24
}) => {
    const sizeStyle = { width: `${size}px`, height: `${size}px` };

    const list = Array.isArray(semesters) ? semesters : semesters ? [semesters] : [];
    const first = list.includes("Semester 1");
    const second = list.includes("Semester 2");

    // Nothing known — say nothing. Claiming a semester here is worse than leaving the cell empty,
    // and it also keeps the full circle below unambiguous: it now only ever means "year course".
    if (!first && !second) {
        return null;
    }

    if (first && second) {
        return <Circle style={sizeStyle} />;
    }

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d={first ? "M12 2a10 10 0 0 0 0 20" : "M12 2a10 10 0 0 1 0 20"} />
            <path d="M12 2v20" />
        </svg>
    );
};

export default SemesterIndicator;
