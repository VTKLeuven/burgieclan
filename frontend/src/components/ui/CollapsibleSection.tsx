import React, { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    header: ReactNode;
    children: ReactNode;
    defaultCollapsed?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
    header, 
    children, 
    defaultCollapsed = true
}) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className="mt-6 border rounded-lg shadow-xs">
            <button onClick={toggleCollapse} className="w-full text-left focus:outline-hidden">
                <div className="flex justify-between items-center px-4 py-1 bg-gray-100 rounded-t-lg">
                    {header}
                    <ChevronDown
                        className={`text-vtk-blue-500 transform transition-transform duration-400 ${isCollapsed ? 'rotate-0' : '-rotate-180'
                            }`}
                        aria-hidden="true"
                    />
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