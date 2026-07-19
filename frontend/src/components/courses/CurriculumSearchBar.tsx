import Input from '@/components/ui/Input';
import { Filter, Search, X } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SearchProps {
    onSearch: (filters: SearchFilters) => void;
    clearSearch: () => void;
}

export interface SearchFilters {
    query: string;
    semester?: number | null;
    minCredits?: number | null;
    maxCredits?: number | null;
    showOnlyFavorites: boolean;
}

export default function CurriculumSearchBar({ onSearch, clearSearch }: SearchProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [semester, setSemester] = useState<number | null>(null);
    const [minCredits, setMinCredits] = useState<string>('');
    const [maxCredits, setMaxCredits] = useState<string>('');
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

    const handleSearch = () => {
        onSearch({
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
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div>
            <div className="flex items-center gap-2">
                <div className="relative grow">
                    <Input
                        type="text"
                        placeholder={t('curriculum-navigator.search-placeholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        icon={Search}
                    />
                    {(query || showFilters || semester || minCredits || maxCredits || showOnlyFavorites) && (
                        <button
                            onClick={handleClear}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-vtk-muted transition-colors hover:text-vtk-ink"
                            title={t('curriculum-navigator.clear-search')}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`vtk-icon-button h-[42px] w-[42px] ${showFilters ? 'border-vtk-ink bg-vtk-paper-2' : ''}`}
                    title={t('curriculum-navigator.advanced-filters')}
                >
                    <Filter size={16} />
                </button>
                <button
                    onClick={handleSearch}
                    className="vtk-button vtk-button-primary h-[42px]"
                >
                    {t('curriculum-navigator.search-submit')}
                </button>
            </div>

            {showFilters && (
                <div className="vtk-panel vtk-panel-muted mt-2.5 grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
                    <div className="vtk-field">
                        <label className="vtk-field-label">{t('curriculum-navigator.semester')}</label>
                        <select
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
                        <label className="vtk-field-label">{t('curriculum-navigator.credits')}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                placeholder="Min"
                                className="vtk-input"
                                value={minCredits}
                                onChange={(e) => setMinCredits(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <span className="text-vtk-muted">-</span>
                            <input
                                type="number"
                                min="0"
                                placeholder="Max"
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
                                className="h-4 w-4 accent-vtk-ink"
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