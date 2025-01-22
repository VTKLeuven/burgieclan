import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

interface FormFieldProps {
    label: string;
    error?: string;
    type?: 'text' | 'select';
    options?: Array<{ id: string; name: string }>;
    placeholder?: string;
    registration: UseFormRegisterReturn;
    className?: string;
    prefill?: { id: string; name: string } | null;
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    error,
    type = 'text',
    prefill = null,
    options = [],
    placeholder,
    registration,
    className = ''
}) => {
    const inputClassName = `
    block w-full rounded-md border-0 py-1.5 px-3
    text-gray-900 shadow-sm ring-1 ring-inset
    ring-gray-300 placeholder:text-gray-400
    focus:ring-2 focus:ring-inset focus:ring-indigo-600
    sm:text-sm sm:leading-6
    ${error ? 'ring-red-500' : 'ring-gray-300'}
    ${className}
  `;

    return (
        <div>
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-900">
                    {label}
                </label>
                {error && (
                    <p className="text-red-500 text-xs">{error}</p>
                )}
            </div>
            <div className="mt-2">
                {type === 'select' ? (
                    <select
                        {...registration}
                        className={inputClassName}
                    >
                        {prefill ? (
                            <option value={prefill.id}>
                                {prefill.name}
                            </option>
                        ) : (
                            <option value="">Select {label.toLowerCase()}</option>
                        )}
                        {options.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={type}
                        {...registration}
                        placeholder={placeholder}
                        className={inputClassName}
                    />
                )}
            </div>
        </div>
    );
};