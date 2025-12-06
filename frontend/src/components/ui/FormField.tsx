import ComboboxController from '@/components/ui/ComboboxController';
import Input from '@/components/ui/Input';
import {
    Controller,
    type Control,
    type FieldError,
    type FieldValues,
    type Path,
    type UseFormRegisterReturn,
} from 'react-hook-form';

export interface Option {
    id: number | string;
    name?: string;
}

export interface FormFieldProps<TFieldValues extends FieldValues = FieldValues> {
    label: string;
    error?: FieldError;
    type?: 'text' | 'combobox';
    options?: Option[]; // used when type is "combobox"
    placeholder?: string;
    /** For fields that are registered with useForm (e.g. text inputs) */
    registration?: UseFormRegisterReturn;
    /** For fields that use RHF Controller (e.g. combobox) */
    control?: Control<TFieldValues>;
    name: Path<TFieldValues>;
    disabled?: boolean;
    /** Optional: limit the number of visible options in the combobox */
    visibleOptions?: number;
}

export const FormField = <TFieldValues extends FieldValues = FieldValues>({
    label,
    error,
    type = 'text',
    options = [],
    placeholder,
    registration,
    control,
    name,
    disabled,
    visibleOptions,
}: FormFieldProps<TFieldValues>) => {
    // For text fields, use the registration props to bind RHF.
    if (type === 'text') {
        return (
            <div>
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900">{label}</label>
                    {error && <p className="text-red-500 text-xs">{error?.message}</p>}
                </div>
                <div className="mt-2">
                    <Input
                        type="text"
                        placeholder={placeholder || ''}
                        passive={!!error}
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
