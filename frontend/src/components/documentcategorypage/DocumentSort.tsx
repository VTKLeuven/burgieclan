import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react';

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
    const buttonStyle = "h-8 flex items-center gap-1.5 border border-border-strong bg-surface px-2.5 text-body text-fg shadow-xs transition-colors hover:bg-surface-hover focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus";

    return (
        <div className="relative">
            <div className="flex items-center" ref={dropdownRef}>
                <div className="relative">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`${buttonStyle} rounded-l-control`}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                    >
                        <ArrowUpDown size={16} className="text-icon" aria-hidden="true" />
                        <span className="text-fg-muted">{t('document.sort-by')}</span>
                        <span className="font-medium">{currentFieldLabel}</span>
                        <ChevronDown size={14} className="text-icon" aria-hidden="true" />
                    </button>

                    {isOpen && (
                        <div className="absolute left-0 z-30 mt-1.5 w-52 overflow-hidden rounded-card border border-border bg-surface p-1 shadow-popover">
                            <div>
                                {sortableFields.map((field) => (
                                    <button
                                        key={field.value}
                                        onClick={() => handleFieldChange(field.value)}
                                        className={`block h-8 w-full rounded-[8px] px-2 text-left text-body hover:bg-neutral-150 ${
                                            currentSort.field === field.value ? 'font-medium text-fg' : 'text-fg-secondary'
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
                    className={`${buttonStyle} -ml-px rounded-r-control px-2 text-icon`}
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