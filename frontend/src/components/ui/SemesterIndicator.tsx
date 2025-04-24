import React from 'react';
import { Circle } from 'lucide-react';

interface SemesterIndicatorProps {
    semesters?: string[] | string;
    size?: number;
}

const SemesterIndicator: React.FC<SemesterIndicatorProps> = ({
    semesters,
    size = 24
}) => {
    const sizeStyle = { width: `${size}px`, height: `${size}px` };

    if (!Array.isArray(semesters) || semesters.includes("Semester 1") && semesters.includes("Semester 2")) {
        // Default - empty circle outline
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
            transform={semesters.includes("Semester 1") ? "" : "scale(-1, 1)"}
        >
            <path d="M12 2a10 10 0 0 0 0 20" />
            <path d="M12 2v20" />
        </svg>
    );
};

export default SemesterIndicator;