import React from 'react';

interface CheckboxProps {
    label: string;
    className?: string;
    checked: boolean;
    name?: string;
    disabled?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
                                                       label,
                                                       className,
                                                       checked,
                                                       name,
                                                       disabled,
                                                       onChange,
                                                   }) => {
    return (
        <div className={`flex items-center ${className}`}>
            <input
                type="checkbox"
                name={name}
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                checked={checked}
                disabled={disabled}
                onChange={onChange}
            />
            <label className="ml-2 block text-sm font-medium text-gray-900">
                { label }
            </label>
        </div>
    );
};
