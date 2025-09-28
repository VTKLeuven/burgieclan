import ComboboxController from '@/components/ui/ComboboxController';
import React from 'react';
import { Controller, FieldError, UseFormRegisterReturn } from 'react-hook-form';

export interface Option {
    id: number | string;
    name?: string;
}

export interface FormFieldProps {
    label: string;
    error?: FieldError;
    type?: 'text' | 'combobox';
    options?: Option[]; // used when type is "combobox"
    placeholder?: string;
    /** For fields that are registered with useForm (e.g. text inputs) */
    registration?: UseFormRegisterReturn;
    /** For fields that use RHF Controller (e.g. combobox) */
    control?: any; // ideally use proper typing from react-hook-form
    name: string;
    className?: string;
    disabled?: boolean;
    /** Optional: limit the number of visible options in the combobox */
    visibleOptions?: number;
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    error,
    type = 'text',
    options = [],
    placeholder,
    registration,
    control,
    name,
    className = '',
    disabled,
    visibleOptions,
}) => {
    // For text fields, use the registration props to bind RHF.
    if (type === 'text') {
        return (
            <div>
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900">{label}</label>
                    {error && <p className="text-red-500 text-xs">{error?.message}</p>}
                </div>
                <div className="mt-2">
                    <input
                        type="text"
                        placeholder={placeholder}
                        className={`
              block w-full rounded-md border-0 py-1.5 px-3
              text-gray-900 shadow-sm ring-1 ring-inset
              ring-gray-300 placeholder:text-gray-400
              focus:ring-2 focus:ring-inset focus:ring-amber-600
              sm:text-sm sm:leading-6
              ${error ? 'ring-red-500' : 'ring-gray-300'}
              ${disabled ? 'bg-gray-50 text-gray-500' : ''}
              ${className}
            `}
                        disabled={disabled}
                        {...(registration || {})}
                    />
                </div>
            </div>
        );
    }

    // For combobox fields, use Controller
    return (
        <div>
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-900">{label}</label>
                {error && <p className="text-red-500 text-xs">{error?.message}</p>}
            </div>
            <div className="mt-2">
                <Controller
                    name={name}
                    control={control}
                    render={({ field: { value, onChange, onBlur } }) => (
                        <ComboboxController
                            value={value}
                            onChange={onChange}
                            onBlur={onBlur}
                            options={options}
                            placeholder={placeholder}
                            disabled={disabled}
                            visibleOptions={visibleOptions}
                            name={name}
                        />
                    )}
                />
            </div>
        </div>
    );
};

export default FormField;
