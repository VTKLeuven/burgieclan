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
        className={`flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50 focus:outline-hidden ${hasActiveFilters ? 'bg-vtk-blue-50 border-vtk-blue-200' : ''
          }`}
        aria-expanded={isOpen}
      >
        <Filter size={16} className={`mr-1 ${hasActiveFilters ? 'text-vtk-blue-600' : ''}`} />
        <span>{t('document.filter')}</span>
        {hasActiveFilters && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-vtk-blue-500 text-white rounded-full">
            {Object.values(filters).filter(v =>
              v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : v)
            ).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-80 bg-white rounded-md shadow-lg border p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">{t('document.filters')}</h3>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
              >
                <X size={12} className="mr-1" />
                {t('document.clear-filters')}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('document.tags')}
                <span className="text-xs text-gray-500 ml-1">
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
              <label htmlFor="creator" className="block text-sm font-medium text-gray-700 mb-1">
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
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md mr-2"
            >
              {t('document.cancel')}
            </button>
            <button
              onClick={applyFilters}
              className="px-3 py-2 text-sm bg-vtk-blue-500 text-white hover:bg-vtk-blue-600 rounded-md"
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