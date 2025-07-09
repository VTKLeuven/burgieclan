import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ArrowDown, ArrowUp } from 'lucide-react';

export type SortOption = {
    field: string;
    direction: 'asc' | 'desc';
};

export type SortableField = {
    value: string;
    label: string;
};

interface DocumentSortProps {
    currentSort: SortOption;
    onSortChange: (sort: SortOption) => void;
}

const DocumentSort: React.FC<DocumentSortProps> = ({ currentSort, onSortChange }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle clicks outside the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const sortableFields: SortableField[] = [
        { value: 'name', label: t('document.name') },
        { value: 'creator.fullName', label: t('document.creator') },
        { value: 'year', label: t('document.year') },
        { value: 'updatedAt', label: t('document.update-date') },
        { value: 'createdAt', label: t('document.create-date') },
    ];

    const toggleDirection = () => {
        onSortChange({
            field: currentSort.field,
            direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
        });
    };

    const handleFieldChange = (field: string) => {
        onSortChange({
            field,
            direction: currentSort.direction
        });
        setIsOpen(false);
    };

    const currentFieldLabel = sortableFields.find(f => f.value === currentSort.field)?.label || t('document.sort-by');

    // Common button style to ensure consistent height
    const buttonStyle = "h-10 flex items-center px-3 py-2 text-sm border focus:outline-none";

    return (
        <div className="relative">
            <div className="flex items-center" ref={dropdownRef}>
                <div className="relative">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`${buttonStyle} rounded-l-md hover:bg-gray-50`}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                    >
                        <span>{currentFieldLabel}</span>
                        <ChevronDown size={16} className="ml-1" />
                    </button>

                    {isOpen && (
                        <div className="absolute right-0 z-10 mt-1 w-48 bg-white rounded-md shadow-lg">
                            <div className="py-1">
                                {sortableFields.map((field) => (
                                    <button
                                        key={field.value}
                                        onClick={() => handleFieldChange(field.value)}
                                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                            currentSort.field === field.value ? 'bg-gray-50 text-vtk-blue-600' : 'text-gray-700'
                                        }`}
                                    >
                                        {field.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={toggleDirection}
                    className={`${buttonStyle} border-l-0 rounded-r-md hover:bg-gray-50`}
                    title={currentSort.direction === 'asc' ? t('document.sort-ascending') : t('document.sort-descending')}
                >
                    {currentSort.direction === 'asc' ? (
                        <ArrowUp size={16} />
                    ) : (
                        <ArrowDown size={16} />
                    )}
                </button>
            </div>
        </div>
    );
};

export default DocumentSort;