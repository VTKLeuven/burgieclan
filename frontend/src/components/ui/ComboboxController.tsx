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

    const inputClassName = `vtk-input block appearance-none pr-9 ${disabled ? 'text-vtk-muted' : ''}`;

    return (
        <div>
            <Combobox value={selectedOption} onChange={(option: Option | null) => onChange(option?.id)} disabled={disabled}>
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
                                <ChevronDown className="h-5 w-5 text-vtk-muted" aria-hidden="true" />
                            </div>
                        </Combobox.Button>
                        {open && (
                            <Combobox.Options className="absolute z-10 mt-1.5 max-h-60 w-full overflow-auto text-base focus:outline-hidden sm:text-sm rounded-[14px] border border-vtk-line bg-vtk-surface shadow-[0_18px_42px_rgba(10,15,31,0.12)]">
                                {limitedOptions.map((option) => (
                                    <Combobox.Option
                                        key={option.id}
                                        value={option}
                                        className={({ active }) =>
                                            `block w-full cursor-pointer px-4 py-2 text-sm ${active ? 'bg-vtk-ink text-vtk-paper' : 'text-vtk-ink hover:bg-vtk-paper-2'
                                            }`
                                        }
                                    >
                                        {option.name}
                                    </Combobox.Option>
                                ))}
                                {limitedOptions.length === 0 && query !== '' && (
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
