import React from 'react';
import { Combobox, ComboboxInput, ComboboxOptions } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { GlobeAmericasIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { FieldError } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useSearch } from '@/hooks/useSearch';
import type { Course, Module, Program, Document } from '@/types/entities';
import SearchResult from "@/components/search/SearchResult";

type SearchResults = {
    courses: Course[];
    modules: Module[];
    programs: Program[];
    documents: Document[];
};

interface SearchFieldProps {
    label: string;
    error?: FieldError;
    name: string;
    control: any;
    disabled?: boolean;
    entities?: Array<keyof SearchResults>;
    placeholder?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({
    label,
    error,
    name,
    control,
    disabled = false,
    entities = ['courses', 'modules', 'programs', 'documents'],
    placeholder,
}) => {
    const { t } = useTranslation();
    const [query, setQuery] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);
    const { items, loading } = useSearch({ query, entities });

    const handleResultClick = (item: any, onChange: (value: any) => void) => {
        onChange(item);
        setQuery('');
        setIsFocused(false);
    };

    return (
        <div>
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-900">{label}</label>
                {error && <p className="text-red-500 text-xs">{error?.message}</p>}
            </div>
            <div className="mt-2 relative">
                <Controller
                    name={name}
                    control={control}
                    render={({ field: { value, onChange, onBlur } }) => (
                        <Combobox
                            value={value}
                            onChange={(selectedItem) => {
                                onChange(selectedItem?.name || selectedItem?.id?.toString() || '');
                                setQuery('');
                                setIsFocused(false);
                            }}
                            disabled={disabled}
                        >
                            <div className="relative">
                                <MagnifyingGlassIcon
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                                <ComboboxInput
                                    autoComplete='off'
                                    className={`
                                        block w-full rounded-md border-0 py-1.5 pl-10 pr-3
                                        text-gray-900 shadow-sm ring-1 ring-inset
                                        ${error ? 'ring-red-500' : 'ring-gray-300'}
                                        ${disabled ? 'bg-gray-50 text-gray-500' : ''}
                                        placeholder:text-gray-400
                                        focus:ring-2 focus:ring-inset focus:ring-amber-600
                                        sm:text-sm sm:leading-6
                                    `}
                                    placeholder={placeholder || `${t('search_')} ${name}`}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={(e) => {
                                        if (!e.relatedTarget?.closest('.search-options')) {
                                            setIsFocused(false);
                                            onBlur();
                                        }
                                    }}
                                    displayValue={(item: any) => item?.name ?? ''}
                                    value={query}
                                />

                                {isFocused && (
                                    <ComboboxOptions 
                                        static
                                        className="search-options absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                                    >
                                        {loading && (
                                            <div className="flex justify-center py-12">
                                                <svg className="animate-spin h-8 w-8 text-gray-900" xmlns="http://www.w3.org/2000/svg"
                                                    fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                        strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                                </svg>
                                            </div>
                                        )}

                                        {!error && query.length < 2 && (
                                            <div className="border-gray-100 px-6 py-6 text-center text-sm sm:px-14">
                                                <GlobeAmericasIcon className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true" />
                                                <p className="mt-4 font-semibold text-gray-900">{t('search.info')}</p>
                                                <p className="mt-2 text-gray-500">{t('search.info_sub')}</p>
                                            </div>
                                        )}

                                        {!loading && query.length >= 2 && (
                                            <ul className="max-h-[calc(100vh-15rem)] scroll-pb-2 scroll-pt-11 space-y-2 overflow-y-auto pb-2 pl-0">
                                                {items.courses && entities.includes('courses') && items.courses.length > 0 && (
                                                    <ul className="mt-2 text-sm text-gray-800 pl-0">
                                                        {items.courses.map((course) => (
                                                            <li className="list-none" key={course.id} onClick={() => handleResultClick(course, onChange)}>
                                                                <SearchResult 
                                                                    mainResult={course.name!} 
                                                                    extraInfo={course.code}
                                                                    value={course.id.toString()} 
                                                                />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                
                                                {items.modules && entities.includes('modules') && items.modules.length > 0 && (
                                                    <ul className="mt-2 text-sm text-gray-800 pl-0">
                                                        {items.modules.map((module) => (
                                                            <li className="list-none" key={module.id} onClick={() => handleResultClick(module, onChange)}>
                                                                <SearchResult 
                                                                    mainResult={module.name!} 
                                                                    extraInfo={module.program!.name}
                                                                    value={module.id.toString()} 
                                                                />  
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                
                                                {items.programs && entities.includes('programs') && items.programs.length > 0 && (
                                                    <ul className="mt-2 text-sm text-gray-800 pl-0">
                                                        {items.programs.map((program) => (
                                                            <li className="list-none" key={program.id} onClick={() => handleResultClick(program, onChange)}>
                                                                <SearchResult 
                                                                    mainResult={program.name!} 
                                                                    value={program.id.toString()}
                                                                />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                
                                                {items.documents && entities.includes('documents') && items.documents.length > 0 && (
                                                    <ul className="mt-2 text-sm text-gray-800 pl-0">
                                                        {items.documents.map((document) => (
                                                            <li className="list-none" key={document.id} onClick={() => handleResultClick(document, onChange)}>
                                                                <SearchResult 
                                                                    mainResult={document.name!} 
                                                                    extraInfo={document.course!.name} 
                                                                    value={document.id.toString()} 
                                                                />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {entities.every(entity => items[entity]?.length === 0) && (
                                                    <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                                                        {t('search.no_results')}
                                                    </div>
                                                )}
                                            </ul>
                                        )}
                                    </ComboboxOptions>
                                )}
                            </div>
                        </Combobox>
                    )}
                />
            </div>
        </div>
    );
};

export default SearchField;