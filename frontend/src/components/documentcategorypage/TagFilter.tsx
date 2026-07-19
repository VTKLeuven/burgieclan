import Input from '@/components/ui/Input';
import useFetchTags from '@/hooks/useFetchTags';
import { Course, DocumentCategory, Tag } from '@/types/entities';
import { X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TagFilterProps {
  selectedTagIds: number[];
  selectedTagQueries: string[];
  onTagSelectionChange: (tagIds: number[], tagQueries: string[]) => void;
  course?: Course;
  category?: DocumentCategory;
}

const TagFilter: React.FC<TagFilterProps> = ({
  selectedTagIds,
  selectedTagQueries,
  onTagSelectionChange,
  course,
  category
}) => {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load all tags for this course/category (only once)
  const { tags: availableTags, loading: tagsLoading } = useFetchTags({
    course,
    category
  });
  
  const selectedTags = useMemo(() => {
    return availableTags.filter(tag => tag.id && selectedTagIds.includes(tag.id));
  }, [availableTags, selectedTagIds]);
  
  // Filter available tags based on input - memoize to avoid unnecessary recalculations
  const filteredTags = useMemo(() => {
    // Create a Set of selected IDs for faster lookup
    const selectedIds = new Set(selectedTagIds);
    
    if (tagInput.trim() === '') {
      return availableTags.filter(tag => tag.id && !selectedIds.has(tag.id));
    } else {
      return availableTags.filter(tag => 
        tag.name?.toLowerCase().includes(tagInput.toLowerCase()) && 
        tag.id && !selectedIds.has(tag.id)
      );
    }
  }, [tagInput, availableTags, selectedTagIds]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add an existing tag by Tag object
  const addExistingTag = (tag: Tag) => {
    if (!tag.id) return;
    
    if (!selectedTagIds.includes(tag.id)) {
      onTagSelectionChange([...selectedTagIds, tag.id], selectedTagQueries);
    }
    setTagInput('');
  };

  // Add a custom tag query
  const addCustomTagQuery = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    // Check if this matches an existing tag
    const exactMatch = availableTags.find(tag => 
      tag.name?.toLowerCase() === trimmedQuery.toLowerCase()
    );
    
    if (exactMatch && exactMatch.id) {
      // If exact match found, add by ID instead
      addExistingTag(exactMatch);
      return;
    }
    
    // Otherwise add as a custom query if not already added
    if (!selectedTagQueries.includes(trimmedQuery)) {
      onTagSelectionChange(selectedTagIds, [...selectedTagQueries, trimmedQuery]);
    }
    
    setTagInput('');
  };

  // Remove a tag by ID
  const removeExistingTag = (tagId: number) => {
    onTagSelectionChange(
      selectedTagIds.filter(id => id !== tagId),
      selectedTagQueries
    );
  };

  // Remove a custom tag query
  const removeCustomTagQuery = (query: string) => {
    onTagSelectionChange(
      selectedTagIds,
      selectedTagQueries.filter(q => q !== query)
    );
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addCustomTagQuery(tagInput);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Handle container clicks to focus input
  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.tag-chip')) return;
    
    const input = containerRef.current?.querySelector('input');
    if (input) {
      input.focus();
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex min-h-[42px] w-full cursor-text flex-wrap items-center rounded-xl border border-vtk-line-2 bg-vtk-paper px-2 focus-within:border-vtk-ink focus-within:shadow-[0_0_0_3px_rgba(14,26,54,0.08)]"
        onClick={handleContainerClick}
      >
        {/* Display selected tags by ID */}
        {selectedTags.map(tag => (
          <div 
            key={`id-${tag.id}`} 
            className="tag-chip m-1 flex items-center rounded-full bg-vtk-paper-2 px-2 py-1 text-xs text-vtk-ink"
            title={t('document.filter-by-tag-id')}
          >
            <span>{tag.name}</span>
            <button 
              type="button" 
              className="ml-1 text-vtk-body hover:text-vtk-ink"
              onClick={() => tag.id && removeExistingTag(tag.id)}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        
        {/* Display custom tag queries */}
        {selectedTagQueries.map(query => (
          <div 
            key={`query-${query}`} 
            className="tag-chip m-1 flex items-center rounded-full bg-vtk-paper-2 px-2 py-1 text-xs text-vtk-ink"
            title={t('document.filter-by-tag-name')}
          >
            <span>&quot;{query}&quot;</span>
            <button 
              type="button" 
              className="ml-1 text-vtk-body hover:text-vtk-ink"
              onClick={() => removeCustomTagQuery(query)}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        
        {/* Tag input */}
        <Input
          type="text"
          placeholder={selectedTags.length > 0 || selectedTagQueries.length > 0 ? "" : t('document.add-tags')}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          aria-label={t('document.add-tags')}
          borderless
        />
      </div>
      
      {/* Tag suggestions dropdown - only show if there are matching tags */}
      {showSuggestions && (
        <>
          {tagsLoading || filteredTags.length > 0 ? (
            <ul className="absolute z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-[14px] border border-vtk-line bg-vtk-surface shadow-[0_18px_42px_rgba(10,15,31,0.12)]">
              {tagsLoading ? (
                <li className="px-3 py-2 text-sm text-vtk-muted">{t('common.loading')}</li>
              ) : (
                filteredTags.map(tag => (
                  <li 
                    key={tag.id} 
                    className="px-3 py-2 text-sm hover:bg-vtk-paper-2 cursor-pointer"
                    onClick={() => addExistingTag(tag)}
                  >
                    {tag.name}
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
};

export default TagFilter;