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
        <div className="vtk-panel overflow-hidden">
            <button
                onClick={toggleCollapse}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-vtk-paper"
                aria-expanded={!isCollapsed}
            >
                {header}
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-vtk-muted transition-transform duration-300 ${isCollapsed ? 'rotate-0' : '-rotate-180'
                        }`}
                    aria-hidden="true"
                />
            </button>
            {!isCollapsed && (
                <div className="border-t border-vtk-line">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;