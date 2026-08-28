import Input from '@/components/ui/Input';
import { Filter, LoaderCircle, Search, X } from 'lucide-react';
import React, { useState } from 'react';
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

export default function CurriculumSearchBar({ onSearch, clearSearch, loading = false }: SearchProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [semester, setSemester] = useState<number | null>(null);
    const [minCredits, setMinCredits] = useState<string>('');
    const [maxCredits, setMaxCredits] = useState<string>('');
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

    const handleSearch = async () => {
        await onSearch({
            query: query.trim(),
            semester: semester,
            minCredits: minCredits ? parseInt(minCredits) : null,
            maxCredits: maxCredits ? parseInt(maxCredits) : null,
            showOnlyFavorites
        });
    };

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
        if (e.key === 'Enter' && !loading) void handleSearch();
    };

    return (
        <div>
            <div className="flex items-center gap-2">
                <div className="relative grow">
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
                    {(query || showFilters || semester || minCredits || maxCredits || showOnlyFavorites) && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-vtk-muted transition-colors hover:text-vtk-ink focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy rounded-sm"
                            title={t('curriculum-navigator.clear-search')}
                            aria-label={t('curriculum-navigator.clear-search')}
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    aria-expanded={showFilters}
                    aria-controls="curriculum-filters-panel"
                    aria-label={t('curriculum-navigator.advanced-filters')}
                    className={`vtk-icon-button h-[42px] w-[42px] ${showFilters ? 'border-vtk-ink bg-vtk-paper-2' : ''}`}
                    title={t('curriculum-navigator.advanced-filters')}
                >
                    <Filter size={16} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => void handleSearch()}
                    disabled={loading}
                    className="vtk-button vtk-button-primary h-[42px]"
                >
                    {loading && <LoaderCircle className="animate-spin" size={16} />}
                    {t('curriculum-navigator.search-submit')}
                </button>
            </div>

            {showFilters && (
                <div
                    id="curriculum-filters-panel"
                    role="region"
                    aria-label={t('curriculum-navigator.advanced-filters')}
                    className="vtk-panel vtk-panel-muted mt-2.5 grid grid-cols-1 gap-4 p-4 md:grid-cols-3"
                >
                    <div className="vtk-field">
                        <label htmlFor="curriculum-semester-select" className="vtk-field-label">{t('curriculum-navigator.semester')}</label>
                        <select
                            id="curriculum-semester-select"
                            className="vtk-select"
                            value={semester || ''}
                            onChange={(e) => setSemester(e.target.value ? parseInt(e.target.value) : null)}
                            onKeyDown={handleKeyDown}
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
                                className="vtk-input"
                                value={minCredits}
                                onChange={(e) => setMinCredits(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <span className="text-vtk-muted" aria-hidden="true">-</span>
                            <input
                                type="number"
                                min="0"
                                placeholder="Max"
                                aria-label="Max credits"
                                className="vtk-input"
                                value={maxCredits}
                                onChange={(e) => setMaxCredits(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-vtk-body">
                            <input
                                type="checkbox"
                                checked={showOnlyFavorites}
                                onChange={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                className="h-4 w-4 accent-vtk-ink focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy focus-visible:ring-offset-2"
                                onKeyDown={handleKeyDown}
                            />
                            {t('curriculum-navigator.show-only-favorites')}
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
