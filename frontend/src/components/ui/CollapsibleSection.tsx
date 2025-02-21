import React, { useState, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

interface CollapsibleSectionProps {
    header: ReactNode;
    children: ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ header, children }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className="mt-6 border rounded-lg shadow-sm">
            <button onClick={toggleCollapse} className="w-full text-left focus:outline-none">
                <div className="flex justify-between items-center px-4 py-1 bg-gray-100 rounded-t-lg">
                    {header}
                    <FontAwesomeIcon icon={isCollapsed ? faChevronDown : faChevronUp} className="text-vtk-blue-500" />
                </div>
            </button>
            <div
                className={`transition-all duration-300 ease-in-out origin-top ${isCollapsed ? 'scale-y-0 h-0' : 'scale-y-100 h-auto'
                    }`}
            >
                {children}
            </div>
        </div>
    );
};

export default CollapsibleSection;