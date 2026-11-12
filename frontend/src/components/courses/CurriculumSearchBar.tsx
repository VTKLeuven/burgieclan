import Input from '@/components/ui/Input';
import { LoaderCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SearchProps {
    onSearch: (filters: SearchFilters) => void | Promise<void>;
    clearSearch: () => void;
    loading?: boolean;
}

export interface SearchFilters {
    query: string;
    semester?: number | null;
    minCredits?: number | null;
    maxCredits?: number | null;
    showOnlyFavorites: boolean;
}

/**
 * The toolbar above the curriculum: a search field that answers as you type, and a filter chip
 * for semester, credits and favourites. Searching is client-side once the tree is loaded, so a
 * short pause after typing is enough; Enter searches straight away.
 */
export default function CurriculumSearchBar({ onSearch, clearSearch, loading = false }: SearchProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [semester, setSemester] = useState<number | null>(null);
    const [minCredits, setMinCredits] = useState<string>('');
    const [maxCredits, setMaxCredits] = useState<string>('');
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const onSearchRef = useRef(onSearch);
    const clearRef = useRef(clearSearch);
    useEffect(() => {
        onSearchRef.current = onSearch;
        clearRef.current = clearSearch;
    });

    const activeFilterCount = [semester, minCredits, maxCredits, showOnlyFavorites].filter(Boolean).length;
    const hasInput = Boolean(query.trim()) || activeFilterCount > 0;

    const filters = useCallback((): SearchFilters => ({
        query: query.trim(),
        semester,
        minCredits: minCredits ? parseInt(minCredits) : null,
        maxCredits: maxCredits ? parseInt(maxCredits) : null,
        showOnlyFavorites,
    }), [query, semester, minCredits, maxCredits, showOnlyFavorites]);

    useEffect(() => {
        if (!hasInput) {
            clearRef.current();
            return;
        }
        const timer = window.setTimeout(() => { void onSearchRef.current(filters()); }, 250);
        return () => window.clearTimeout(timer);
    }, [filters, hasInput]);

    const handleClear = () => {
        setQuery('');
        setSemester(null);
        setMinCredits('');
        setMaxCredits('');
        setShowOnlyFavorites(false);
        setShowFilters(false);
        clearSearch();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) void onSearch(filters());
        if (e.key === 'Escape') handleClear();
    };

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-64">
                    <Input
                        id="curriculum-search-input"
                        aria-label={t('curriculum-navigator.search-placeholder')}
                        type="text"
                        placeholder={t('curriculum-navigator.search-placeholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        icon={Search}
                    />
                    <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                        {loading && <LoaderCircle className="size-4 animate-spin text-icon" aria-hidden="true" />}
                        {hasInput && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="grid size-6 place-items-center rounded-[6px] text-icon transition-colors hover:bg-neutral-150 hover:text-fg"
                                title={t('curriculum-navigator.clear-search')}
                                aria-label={t('curriculum-navigator.clear-search')}
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    aria-expanded={showFilters}
                    aria-controls="curriculum-filters-panel"
                    className={`vtk-button ${activeFilterCount > 0 ? 'border-info-border! bg-info-bg! text-info-text!' : ''}`}
                >
                    <SlidersHorizontal size={16} aria-hidden="true" className={activeFilterCount > 0 ? 'text-info-text!' : ''} />
                    {t('curriculum-navigator.filters')}
                    {activeFilterCount > 0 && (
                        <span className="rounded-full bg-sky-600 px-1.5 text-micro font-semibold leading-4 text-white tabular">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {showFilters && (
                <div
                    id="curriculum-filters-panel"
                    role="region"
                    aria-label={t('curriculum-navigator.advanced-filters')}
                    className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3 rounded-card border border-border bg-surface-muted p-3"
                >
                    <div className="vtk-field w-40">
                        <label htmlFor="curriculum-semester-select" className="vtk-field-label">{t('curriculum-navigator.semester')}</label>
                        <select
                            id="curriculum-semester-select"
                            className="vtk-select"
                            value={semester || ''}
                            onChange={(e) => setSemester(e.target.value ? parseInt(e.target.value) : null)}
                        >
                            <option value="">{t('curriculum-navigator.any-semester')}</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                        </select>
                    </div>
                    <div className="vtk-field">
                        <span className="vtk-field-label">{t('curriculum-navigator.credits')}</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                placeholder="Min"
                                aria-label="Min credits"
                                className="vtk-input w-20"
                                value={minCredits}
                                onChange={(e) => setMinCredits(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <span className="text-fg-muted" aria-hidden="true">–</span>
                            <input
                                type="number"
                                min="0"
                                placeholder="Max"
                                aria-label="Max credits"
                                className="vtk-input w-20"
                                value={maxCredits}
                                onChange={(e) => setMaxCredits(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                    <label className="flex h-9 cursor-pointer items-center gap-2 text-body text-fg-secondary">
                        <input
                            type="checkbox"
                            checked={showOnlyFavorites}
                            onChange={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className="size-4 accent-sky-600"
                        />
                        {t('curriculum-navigator.show-only-favorites')}
                    </label>
                </div>
            )}
        </div>
    );
}
