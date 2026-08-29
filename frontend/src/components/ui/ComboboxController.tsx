import { Option } from '@/components/ui/FormField';
import { Combobox } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
interface ComboboxControllerProps {
    value: string | undefined;
    onChange: (value: string | number | undefined) => void;
    onBlur: () => void;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    visibleOptions?: number;
    name: string;
    onQueryChange?: (query: string) => void;
    minimumQueryLength?: number;
    optionsLoading?: boolean;
}

const ComboboxController: React.FC<ComboboxControllerProps> = ({
    value,
    onChange,
    onBlur,
    options,
    placeholder,
    disabled,
    visibleOptions,
    name,
    onQueryChange,
    minimumQueryLength = 0,
    optionsLoading = false,
}) => {
    const { t } = useTranslation();
    // Maintain a query for filtering the options.
    const [query, setQuery] = useState('');
    const [rememberedOption, setRememberedOption] = useState<Option | null>(null);

    // Find the currently selected option based on its id.
    const selectedOption = useMemo(
        () => options.find((option) => option && String(option.id) === String(value))
            || (String(rememberedOption?.id) === String(value) ? rememberedOption : null),
        [options, rememberedOption, value]
    );

    const normalizedQuery = query.trim();
    const usesRemoteOptions = onQueryChange !== undefined;

    // Remote options have already been matched by the backend. Filtering them by their
    // displayed label again would drop matches found through another translation or a code.
    const filteredOptions = useMemo(() => {
        if (normalizedQuery.length < minimumQueryLength) return [];
        if (usesRemoteOptions) return options;
        if (!query) return options;
        return options.filter((option) =>
            option?.name?.toLowerCase().includes(query.toLowerCase())
        );
    }, [minimumQueryLength, normalizedQuery.length, options, query, usesRemoteOptions]);

    // If a limit is provided, slice the options accordingly.
    const limitedOptions = visibleOptions
        ? filteredOptions.slice(0, visibleOptions)
        : filteredOptions;

    const inputClassName = `vtk-input block appearance-none pr-9 ${disabled ? 'text-vtk-muted' : ''}`;

    return (
        <div>
            <Combobox
                value={selectedOption}
                onChange={(option: Option | null) => {
                    setRememberedOption(option);
                    onChange(option?.id);
                }}
                // Without this the typed query outlives the dropdown: reopening the field to
                // change an answer showed the list still filtered by whatever was typed the
                // previous time, which read as "the other options are gone".
                onClose={() => {
                    setQuery('');
                    onQueryChange?.('');
                }}
                disabled={disabled}
            >
                {({ open }) => (
                    <div className="relative">
                        <Combobox.Input
                            className={inputClassName}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                onQueryChange?.(e.target.value);
                            }}
                            onBlur={onBlur}
                            displayValue={(option: Option | null) => option?.name || ''}
                            placeholder={placeholder || `${t('select')} ${name}`}
                            autoComplete="off"
                        />
                        <Combobox.Button
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-vtk-muted hover:text-vtk-ink focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy rounded-sm"
                            aria-label={placeholder || `${t('select')} ${name}`}
                        >
                            <ChevronDown className="h-5 w-5" aria-hidden="true" />
                        </Combobox.Button>
                        {open && (
                            <Combobox.Options className="absolute z-10 mt-1.5 max-h-60 w-full overflow-auto text-base focus:outline-hidden sm:text-sm rounded-[14px] border border-vtk-line bg-vtk-surface shadow-[0_18px_42px_rgba(10,15,31,0.12)]">
                                {normalizedQuery.length < minimumQueryLength && (
                                    <div className="px-4 py-2 text-sm text-vtk-muted">
                                        {t('form.combo.minimum_query', { count: minimumQueryLength })}
                                    </div>
                                )}
                                {optionsLoading && normalizedQuery.length >= minimumQueryLength && (
                                    <div className="px-4 py-2 text-sm text-vtk-muted">
                                        {t('form.combo.loading')}
                                    </div>
                                )}
                                {!optionsLoading && limitedOptions.map((option) => (
                                    <Combobox.Option
                                        key={option.id}
                                        value={option}
                                        className={({ active }) =>
                                            `block w-full cursor-pointer px-4 py-2 text-sm ${active ? 'bg-vtk-ink text-vtk-paper' : 'text-vtk-ink hover:bg-vtk-paper-2'
                                            }`
                                        }
                                    >
                                        {option?.name || ''}
                                    </Combobox.Option>
                                ))}
                                {!optionsLoading && limitedOptions.length === 0 && normalizedQuery.length >= minimumQueryLength && query !== '' && (
                                    <div className="px-4 py-2 text-sm text-vtk-muted">
                                        {t('form.combo.no_results')}
                                    </div>
                                )}
                            </Combobox.Options>
                        )}
                    </div>
                )}
            </Combobox>
        </div>
    );
};

export default ComboboxController;
