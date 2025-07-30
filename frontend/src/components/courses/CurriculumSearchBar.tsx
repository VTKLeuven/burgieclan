import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
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
        <div className="mb-6">
            <div className="flex items-center mb-2">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wireframe-primary-blue"
                        placeholder={t('curriculum-navigator.search-placeholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    {(query || showFilters || semester || minCredits || maxCredits || showOnlyFavorites) && (
                        <button
                            onClick={handleClear}
                            className="absolute inset-y-0 right-12 flex items-center pr-3"
                            title={t('curriculum-navigator.clear-search')}
                        >
                            <X size={18} className="text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`ml-2 p-2 rounded-lg border ${showFilters ? 'bg-gray-100 border-wireframe-primary-blue' : 'border-gray-300'}`}
                    title={t('curriculum-navigator.advanced-filters')}
                >
                    <Filter size={20} className={showFilters ? 'text-wireframe-primary-blue' : 'text-gray-600'} />
                </button>
                <button
                    onClick={handleSearch}
                    className="ml-2 py-2 px-4 bg-wireframe-primary-blue text-white rounded-lg hover:bg-blue-700"
                >
                    {t('curriculum-navigator.search-submit')}
                </button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('curriculum-navigator.semester')}</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={semester || ''}
                            onChange={(e) => setSemester(e.target.value ? parseInt(e.target.value) : null)}
                            onKeyDown={handleKeyDown}
                        >
                            <option value="">{t('curriculum-navigator.any-semester')}</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('curriculum-navigator.credits')}</label>
                        <div className="flex space-x-2">
                            <input
                                type="number"
                                min="0"
                                placeholder="Min"
                                className="w-full p-2 border border-gray-300 rounded-md"
                                value={minCredits}
                                onChange={(e) => setMinCredits(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <span className="self-center">-</span>
                            <input
                                type="number"
                                min="0"
                                placeholder="Max"
                                className="w-full p-2 border border-gray-300 rounded-md"
                                value={maxCredits}
                                onChange={(e) => setMaxCredits(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center space-x-2 mt-6">
                            <input
                                type="checkbox"
                                checked={showOnlyFavorites}
                                onChange={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                className="rounded text-wireframe-primary-blue"
                                onKeyDown={handleKeyDown}
                            />
                            <span className="text-sm font-medium text-gray-700">
                                {t('curriculum-navigator.show-only-favorites')}
                            </span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}