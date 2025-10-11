import React, { useState, useMemo } from 'react';
import { Combobox } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { Option } from './FormField';
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
}) => {
    const { t } = useTranslation();
    // Maintain a query for filtering the options.
    const [query, setQuery] = useState('');

    // Find the currently selected option based on its id.
    const selectedOption = useMemo(
        () => options.find((option) => option.id === value) || null,
        [options, value]
    );

    // Filter options based on the query.
    const filteredOptions = useMemo(() => {
        if (!query) return options;
        return options.filter((option) =>
            option.name?.toLowerCase().includes(query.toLowerCase())
        );
    }, [options, query]);

    // If a limit is provided, slice the options accordingly.
    const limitedOptions = visibleOptions
        ? filteredOptions.slice(0, visibleOptions)
        : filteredOptions;

    const inputClassName = `
    block w-full rounded-md border-0 py-1.5 px-3
    text-gray-900 shadow-sm ring-1 ring-inset
    ring-gray-300 placeholder:text-gray-400
    focus:ring-2 focus:ring-inset focus:ring-amber-600
    sm:text-sm sm:leading-6 appearance-none
    ${disabled ? 'bg-gray-50 text-gray-500' : ''}
  `;

    return (
        <div>
            <Combobox value={selectedOption} onChange={(option: Option) => onChange(option?.id)} disabled={disabled}>
                {({ open }) => (
                    <div className="relative">
                        <Combobox.Button className="w-full">
                            <Combobox.Input
                                className={inputClassName}
                                onChange={(e) => setQuery(e.target.value)}
                                onBlur={onBlur}
                                displayValue={(option: Option | null) => option?.name || ''}
                                placeholder={placeholder || `${t('select')} ${name}`}
                                autoComplete="off"
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                        </Combobox.Button>
                        {open && (
                            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                {limitedOptions.map((option) => (
                                    <Combobox.Option
                                        key={option.id}
                                        value={option}
                                        className={({ active }) =>
                                            `block w-full rounded-md px-4 py-2 ${
                                                active ? 'bg-amber-600 text-white' : 'text-gray-900 hover:bg-gray-100'
                                            }`
                                        }
                                    >
                                        {option.name}
                                    </Combobox.Option>
                                ))}
                                {limitedOptions.length === 0 && query !== '' && (
                                    <div className="px-4 py-2 text-sm text-gray-500">
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
