import useFetchTags from '@/hooks/useFetchTags';
import { Tag } from '@/types/entities';
import { Plus, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TagFilterProps {
    selectedTagIds: number[];
    selectedTagQueries: string[];
    onTagSelectionChange: (tagIds: number[], tagQueries: string[]) => void;
}

const UploadTagFilter: React.FC<TagFilterProps> = ({
    selectedTagIds,
    selectedTagQueries,
    onTagSelectionChange
}) => {
    const { t } = useTranslation();
    const [tagInput, setTagInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load all system tags so user can search and select from any existing tags
    const { tags: availableTags, loading: tagsLoading } = useFetchTags();

    const selectedTags = useMemo(() => {
        return availableTags.filter(tag => tag.id && selectedTagIds.includes(tag.id));
    }, [availableTags, selectedTagIds]);

    // Filter available tags based on input
    const filteredTags = useMemo(() => {
        const selectedIds = new Set(selectedTagIds);
        const trimmed = tagInput.trim().toLowerCase();

        if (trimmed === '') {
            return availableTags.filter(tag => tag.id && !selectedIds.has(tag.id));
        }

        return availableTags.filter(tag =>
            tag.name?.toLowerCase().includes(trimmed) &&
            tag.id && !selectedIds.has(tag.id)
        );
    }, [tagInput, availableTags, selectedTagIds]);

    // Check if the current input exactly matches an existing tag (case-insensitive)
    const hasExactMatch = useMemo(() => {
        const trimmed = tagInput.trim().toLowerCase();
        if (!trimmed) return false;

        return availableTags.some(tag =>
            tag.name?.toLowerCase() === trimmed
        );
    }, [tagInput, availableTags]);

    // Handle outside clicks
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
                setSelectedSuggestionIndex(-1);
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
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
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
            addExistingTag(exactMatch);
            return;
        }

        // Check if already in selectedTagQueries (case-insensitive)
        const alreadyAdded = selectedTagQueries.some(
            q => q.toLowerCase() === trimmedQuery.toLowerCase()
        );

        if (!alreadyAdded) {
            onTagSelectionChange(selectedTagIds, [...selectedTagQueries, trimmedQuery]);
        }

        setTagInput('');
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
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
        const trimmed = tagInput.trim();
        const totalSuggestions = filteredTags.length + (trimmed && !hasExactMatch ? 1 : 0);

        if (showSuggestions && totalSuggestions > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev < totalSuggestions - 1 ? prev + 1 : 0
                );
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev > 0 ? prev - 1 : totalSuggestions - 1
                );
                return;
            } else if (e.key === 'Enter') {
                e.preventDefault();

                if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < filteredTags.length) {
                    addExistingTag(filteredTags[selectedSuggestionIndex]);
                    return;
                } else if (selectedSuggestionIndex === filteredTags.length && trimmed && !hasExactMatch) {
                    addCustomTagQuery(trimmed);
                    return;
                } else if (trimmed) {
                    const exact = filteredTags.find(t => t.name?.toLowerCase() === trimmed.toLowerCase());
                    if (exact) {
                        addExistingTag(exact);
                    } else {
                        addCustomTagQuery(trimmed);
                    }
                    return;
                }
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                setSelectedSuggestionIndex(-1);
                return;
            }
        } else if (e.key === 'Enter' && trimmed) {
            e.preventDefault();
            addCustomTagQuery(trimmed);
            return;
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
            return;
        }

        if (e.key === 'Backspace' && tagInput === '') {
            e.preventDefault();

            // Remove the last selected tag when backspace is pressed in an empty input
            if (selectedTagQueries.length > 0) {
                const lastQuery = selectedTagQueries[selectedTagQueries.length - 1];
                removeCustomTagQuery(lastQuery);
            } else if (selectedTagIds.length > 0) {
                const lastTagId = selectedTagIds[selectedTagIds.length - 1];
                removeExistingTag(lastTagId);
            }
        }
    };

    // Handle container clicks to focus input
    const handleContainerClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.tag-chip')) return;

        inputRef.current?.focus();
        setShowSuggestions(true);
    };

    return (
        <div className="relative mt-2" ref={containerRef}>
            <div
                className="flex min-h-[42px] w-full flex-wrap items-center gap-1 rounded-xl border border-vtk-line-2 bg-vtk-paper px-3 py-1.5 text-sm text-vtk-ink focus-within:border-vtk-ink focus-within:shadow-[0_0_0_3px_rgba(14,26,54,0.08)] cursor-text"
                onClick={handleContainerClick}
            >
                {/* Display selected tags by ID */}
                {selectedTags.map(tag => (
                    <div
                        key={`id-${tag.id}`}
                        className="tag-chip h-6 inline-flex items-center rounded-full bg-vtk-paper-2 text-vtk-ink text-xs mr-1 px-2.5"
                    >
                        <span className="text-xs">{tag.name}</span>
                        <button
                            type="button"
                            className="ml-1.5 text-vtk-body hover:text-vtk-ink flex items-center justify-center"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (tag.id) removeExistingTag(tag.id);
                            }}
                            aria-label={`Remove tag ${tag.name}`}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {/* Display custom tag queries */}
                {selectedTagQueries.map(query => (
                    <div
                        key={`query-${query}`}
                        className="tag-chip h-6 inline-flex items-center rounded-full bg-vtk-paper-2 text-vtk-ink text-xs mr-1 px-2.5"
                    >
                        <span className="text-xs">&quot;{query}&quot;</span>
                        <button
                            type="button"
                            className="ml-1.5 text-vtk-body hover:text-vtk-ink flex items-center justify-center"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeCustomTagQuery(query);
                            }}
                            aria-label={`Remove tag query ${query}`}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {/* Tag input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                        setTagInput(e.target.value);
                        setShowSuggestions(true);
                        setSelectedSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                        setShowSuggestions(true);
                        setSelectedSuggestionIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-[100px] py-0.5 px-0 text-sm border-0 focus:ring-0 outline-hidden bg-transparent"
                    placeholder={selectedTags.length > 0 || selectedTagQueries.length > 0 ? "" : t('upload.form.tags.placeholder')}
                    aria-label={t('upload.form.tags.placeholder')}
                />
            </div>

            {/* Tag suggestions dropdown */}
            {showSuggestions && !tagsLoading && (filteredTags.length > 0 || (tagInput.trim() !== '' && !hasExactMatch)) && (
                <ul className="absolute z-20 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-[14px] border border-vtk-line bg-vtk-surface shadow-[0_18px_42px_rgba(10,15,31,0.12)] py-1">
                    {/* Existing tag suggestions */}
                    {filteredTags.map((tag, index) => (
                        <li
                            key={tag.id}
                            className={`px-3 py-2 text-sm hover:bg-vtk-paper-2 cursor-pointer transition-colors ${
                                selectedSuggestionIndex === index ? 'bg-vtk-paper-2 font-medium' : ''
                            }`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                addExistingTag(tag);
                            }}
                        >
                            {tag.name}
                        </li>
                    ))}

                    {/* Create new tag option - only show if input doesn't exactly match an existing tag */}
                    {tagInput.trim() !== '' && !hasExactMatch && (
                        <li
                            className={`px-3 py-2 text-sm hover:bg-vtk-paper-2 cursor-pointer border-t border-vtk-line-2 flex items-center text-vtk-navy transition-colors ${
                                selectedSuggestionIndex === filteredTags.length ? 'bg-vtk-paper-2 font-medium' : ''
                            }`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                addCustomTagQuery(tagInput);
                            }}
                        >
                            <Plus size={16} className="mr-1.5 shrink-0" />
                            {t('upload.form.tags.create', { tag: tagInput.trim() })}
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default UploadTagFilter;