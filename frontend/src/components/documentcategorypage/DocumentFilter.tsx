import Input from '@/components/ui/Input';
import { DocumentFilters } from '@/hooks/useRetrieveDocuments';
import { Course, DocumentCategory } from '@/types/entities';
import { Filter, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TagFilter from './TagFilter';

interface DocumentFilterProps {
  filters: DocumentFilters;
  onFilterChange: (filters: DocumentFilters) => void;
  onClearFilters: () => void;
  course?: Course;
  category?: DocumentCategory;
}

const DocumentFilter: React.FC<DocumentFilterProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  course,
  category
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<DocumentFilters>(filters);
  const filterRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters = Object.values(filters).some(value =>
    value !== undefined && value !== '' &&
    (Array.isArray(value) ? value.length > 0 : value !== false)
  );

  // Handle clicks outside the filter popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTempFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle tag filter changes
  const handleTagChange = (tagIds: number[], tagQueries: string[]) => {
    setTempFilters(prev => ({
      ...prev,
      tagIds,
      tagNames: tagQueries
    }));
  };

  const applyFilters = () => {
    onFilterChange(tempFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters: DocumentFilters = {
      name: '',
      tagIds: [],
      tagNames: [],
      creator: '',
      year: ''
    };
    setTempFilters(emptyFilters);
    onClearFilters();
  };

  return (
    <div className="relative" ref={filterRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`vtk-button vtk-button-sm h-[34px] ${hasActiveFilters ? 'border-vtk-ink bg-vtk-paper-2' : ''
          }`}
        aria-expanded={isOpen}
      >
        <Filter size={16} className={`mr-1 ${hasActiveFilters ? 'text-vtk-ink' : ''}`} />
        <span>{t('document.filter')}</span>
        {hasActiveFilters && (
          <span className="vtk-badge vtk-badge-accent min-h-5 px-1.5 py-0">
            {Object.values(filters).filter(v =>
              v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : v)
            ).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-1.5 w-80 rounded-[18px] border border-vtk-line bg-vtk-surface p-4 shadow-[0_18px_42px_rgba(10,15,31,0.12)]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">{t('document.filters')}</h3>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-vtk-muted hover:text-vtk-body flex items-center"
              >
                <X size={12} className="mr-1" />
                {t('document.clear-filters')}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="vtk-field-label mb-1.5 block">
                {t('document.name')}
              </label>
              <Input
                type="text"
                id="name"
                name="name"
                placeholder={t('document.search-by-name')}
                value={tempFilters.name || ''}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="year" className="vtk-field-label mb-1.5 block">
                {t('document.year')}
              </label>
              <Input
                type="text"
                id="year"
                name="year"
                placeholder={t('document.search-by-year')}
                value={tempFilters.year || ''}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="vtk-field-label mb-1.5 block">
                {t('document.tags')}
                <span className="text-xs text-vtk-muted ml-1">
                  ({t('document.match-all-tags')})
                </span>
              </label>
              <TagFilter
                selectedTagIds={tempFilters.tagIds || []}
                selectedTagQueries={tempFilters.tagNames || []}
                onTagSelectionChange={handleTagChange}
                course={course}
                category={category}
              />
            </div>

            <div>
              <label htmlFor="creator" className="vtk-field-label mb-1.5 block">
                {t('document.creator')}
              </label>
              <Input
                type="text"
                id="creator"
                name="creator"
                placeholder={t('document.search-by-creator')}
                value={tempFilters.creator || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="vtk-button vtk-button-sm vtk-button-ghost mr-2"
            >
              {t('document.cancel')}
            </button>
            <button
              onClick={applyFilters}
              className="vtk-button vtk-button-sm vtk-button-primary"
            >
              {t('document.apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentFilter;