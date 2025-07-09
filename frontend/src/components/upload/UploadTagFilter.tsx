import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus } from 'lucide-react';
import { Course, DocumentCategory, Tag } from '@/types/entities';
import useFetchTags from '@/hooks/useFetchTags';

interface TagFilterProps {
    selectedTagIds: number[];
    selectedTagQueries: string[];
    onTagSelectionChange: (tagIds: number[], tagQueries: string[]) => void;
    course?: Course;
    category?: DocumentCategory;
}

const UploadTagFilter: React.FC<TagFilterProps> = ({
    selectedTagIds,
    selectedTagQueries,
    onTagSelectionChange,
    course,
    category
}) => {
    const { t } = useTranslation();
    const [tagInput, setTagInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load all tags for this course/category (only once)
    const { tags: availableTags, loading: tagsLoading } = useFetchTags({
        course,
        category
    });

    const selectedTags = useMemo(() => {
        return availableTags.filter(tag => tag.id && selectedTagIds.includes(tag.id));
    }, [availableTags, selectedTagIds]);

    // Filter available tags based on input - only show suggestions when user has typed something
    const filteredTags = useMemo(() => {
        // Create a Set of selected IDs for faster lookup
        const selectedIds = new Set(selectedTagIds);

        if (tagInput.trim() === '') {
            return []; // Don't show any suggestions when input is empty
        } else {
            return availableTags.filter(tag =>
                tag.name?.toLowerCase().includes(tagInput.toLowerCase()) &&
                tag.id && !selectedIds.has(tag.id)
            );
        }
    }, [tagInput, availableTags, selectedTagIds]);

    // Check if the current input exactly matches an existing tag
    const hasExactMatch = useMemo(() => {
        if (!tagInput.trim()) return false;

        return availableTags.some(tag =>
            tag.name?.toLowerCase() === tagInput.trim().toLowerCase()
        );
    }, [tagInput, availableTags]);

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

    // Reset selected index when input changes or suggestions close
    useEffect(() => {
        setSelectedSuggestionIndex(-1);
    }, [tagInput, showSuggestions]);

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
        if (showSuggestions && (filteredTags.length > 0 || !hasExactMatch)) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                // Calculate total number of items (filtered tags + optional "create new" option)
                const totalItems = filteredTags.length + (!hasExactMatch ? 1 : 0);
                setSelectedSuggestionIndex(prev => 
                    prev < totalItems - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                // Calculate total number of items
                const totalItems = filteredTags.length + (!hasExactMatch ? 1 : 0);
                setSelectedSuggestionIndex(prev => 
                    prev > 0 ? prev - 1 : totalItems - 1
                );
            } else if (e.key === 'Enter') {
                e.preventDefault();
                
                if (selectedSuggestionIndex >= 0) {
                    // If selection is within filtered tags
                    if (selectedSuggestionIndex < filteredTags.length) {
                        addExistingTag(filteredTags[selectedSuggestionIndex]);
                    } 
                    // If selection is the "create new" option
                    else if (!hasExactMatch) {
                        addCustomTagQuery(tagInput);
                    }
                } else if (tagInput.trim()) {
                    // Default behavior - add as custom tag
                    addCustomTagQuery(tagInput);
                }
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            addCustomTagQuery(tagInput);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
        
        if (e.key === 'Backspace' && tagInput === '') {
            e.preventDefault();
            
            // Remove the last selected tag when backspace is pressed in an empty input
            if (selectedTagQueries.length > 0) {
                // Remove the last custom tag query if any exist
                const lastQuery = selectedTagQueries[selectedTagQueries.length - 1];
                removeCustomTagQuery(lastQuery);
            } else if (selectedTagIds.length > 0) {
                // Remove the last tag ID if no custom queries exist
                const lastTagId = selectedTagIds[selectedTagIds.length - 1];
                removeExistingTag(lastTagId);
            }
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
                className="flex flex-wrap items-center w-full border rounded-md px-2 py-1 border-[#6b7280] bg-white focus-within:ring-1 focus-within:ring-vtk-blue-500 focus-within:border-vtk-blue-500 min-h-[38px] cursor-text"
                onClick={handleContainerClick}
            >
                {/* Display selected tags by ID */}
                {selectedTags.map(tag => (
                    <div
                        key={`id-${tag.id}`}
                        className="tag-chip flex items-center bg-gray-100 text-gray-800 rounded-md px-2 py-1 m-1 text-xs"
                    >
                        <span>{tag.name}</span>
                        <button
                            type="button"
                            className="ml-1 text-gray-600 hover:text-gray-800"
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
                        className="tag-chip flex items-center bg-gray-100 text-gray-800 rounded-md px-2 py-1 m-1 text-xs"
                    >
                        <span>&quot;{query}&quot;</span>
                        <button
                            type="button"
                            className="ml-1 text-gray-600 hover:text-gray-800"
                            onClick={() => removeCustomTagQuery(query)}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {/* Tag input */}
                <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    className="flex-grow min-w-[80px] p-1 text-sm border-0 focus:ring-0"
                    placeholder={selectedTags.length > 0 || selectedTagQueries.length > 0 ? "" : t('upload.form.tags.placeholder')}
                    aria-label={t('upload.form.tags.placeholder')}
                />
            </div>

            {/* Tag suggestions dropdown - only show if user has typed something and not loading */}
            {showSuggestions && tagInput.trim() !== '' && !tagsLoading && (
                <ul className="absolute z-20 w-full bg-white mt-1 border rounded-md shadow-md max-h-60 overflow-y-auto">
                    <>
                        {/* Existing tag suggestions */}
                        {filteredTags.map((tag, index) => (
                            <li
                                key={tag.id}
                                className={`px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                                    selectedSuggestionIndex === index ? 'bg-gray-100' : ''
                                }`}
                                onClick={() => addExistingTag(tag)}
                            >
                                {tag.name}
                            </li>
                        ))}

                        {/* Create new tag option - only show if input doesn't exactly match an existing tag */}
                        {tagInput.trim() !== '' && !hasExactMatch && (
                            <li
                                className={`px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-t flex items-center text-vtk-blue-500 ${
                                    selectedSuggestionIndex === filteredTags.length ? 'bg-gray-100' : ''
                                }`}
                                onClick={() => addCustomTagQuery(tagInput)}
                            >
                                <Plus size={16} className="mr-1" />
                                {t('upload.form.tags.create', { tag: tagInput.trim() })}
                            </li>
                        )}

                        {/* No results message */}
                        {filteredTags.length === 0 && hasExactMatch && (
                            <li className="px-3 py-2 text-sm text-gray-500">
                                {t('upload.form.tags.no-results')}
                            </li>
                        )}
                    </>
                </ul>
            )}
        </div>
    );
};

export default UploadTagFilter;