'use client';

import { cn } from '@/lib/utils';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface SelectOption {
    value: string;
    label: string;
    /** A heading the option is listed under, such as a country above its universities. */
    group?: string;
    /** Extra words it can be found by, besides its label and group. */
    keywords?: string;
}

/** Up to this many options a plain select is quicker; past it the list gets a search field. */
const SEARCH_FROM = 6;

/** Lower case without accents, so "zurich" finds "Zürich". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * A choice from a list. Short lists are a plain select; longer ones (more than five options) are a
 * field you can type in to narrow the list, drawn in the house style rather than by the browser.
 * The list floats above dialogs and is never cut off by them.
 */
export default function Select({
    id,
    value,
    onChange,
    options,
    placeholder,
    disabled,
    className,
    inputClassName,
    'aria-label': ariaLabel,
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    /** Shown while nothing is chosen; also offered as the empty choice in a plain select. */
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** On the field itself, such as a smaller height; the plain select is the field, so it gets both. */
    inputClassName?: string;
    'aria-label'?: string;
}) {
    if (options.length < SEARCH_FROM) {
        return (
            <select
                id={id}
                aria-label={ariaLabel}
                className={cn('vtk-select', className, inputClassName)}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
            >
                {placeholder !== undefined && <option value="" disabled>{placeholder}</option>}
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        );
    }

    return (
        <SearchSelect
            id={id}
            value={value}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            inputClassName={inputClassName}
            aria-label={ariaLabel}
        />
    );
}

function SearchSelect({
    id,
    value,
    onChange,
    options,
    placeholder,
    disabled,
    className,
    inputClassName,
    'aria-label': ariaLabel,
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
    'aria-label'?: string;
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const selected = options.find((option) => option.value === value) ?? null;

    const shown = useMemo(() => {
        const needle = fold(query.trim());
        if (!needle) return options;
        return options.filter((option) => fold(`${option.label} ${option.group ?? ''} ${option.keywords ?? ''}`).includes(needle));
    }, [options, query]);

    return (
        <Combobox
            value={selected}
            by="value"
            immediate
            disabled={disabled}
            onChange={(option: SelectOption | null) => {
                if (option) onChange(option.value);
            }}
            onClose={() => setQuery('')}
        >
            <div className={cn('relative', className)}>
                <ComboboxInput
                    id={id}
                    aria-label={ariaLabel}
                    className={cn('vtk-input pr-9', inputClassName)}
                    displayValue={(option: SelectOption | null) => option?.label ?? ''}
                    placeholder={placeholder}
                    autoComplete="off"
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3 text-icon" aria-hidden="true">
                    <ChevronDown className="size-4" />
                </ComboboxButton>
            </div>
            <ComboboxOptions
                anchor={{ to: 'bottom start', gap: 6 }}
                transition
                className="z-[60] max-h-72 w-(--input-width) min-w-72 overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-popover transition duration-100 ease-out empty:invisible data-closed:-translate-y-1 data-closed:opacity-0"
            >
                {shown.length === 0 ? (
                    <div className="px-3 py-2 text-small text-fg-muted">{t('form.combo.no_results')}</div>
                ) : (
                    shown.map((option, index) => (
                        <Fragment key={option.value}>
                            {option.group && option.group !== shown[index - 1]?.group && (
                                <div className="px-3 pt-2.5 pb-1 text-caption font-medium text-fg-muted first:pt-1.5">{option.group}</div>
                            )}
                            <ComboboxOption
                                value={option}
                                className="group flex cursor-pointer items-center gap-2 rounded-chip px-3 py-1.5 text-body text-fg data-focus:bg-surface-hover"
                            >
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                <Check className="invisible size-4 shrink-0 text-primary-text group-data-selected:visible" aria-hidden="true" />
                            </ComboboxOption>
                        </Fragment>
                    ))
                )}
            </ComboboxOptions>
        </Combobox>
    );
}
