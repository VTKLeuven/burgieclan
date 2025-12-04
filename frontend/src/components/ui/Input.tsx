import { LucideIcon } from 'lucide-react';
import { forwardRef } from 'react';
import './input.css';

type InputProps = {
    id?: string;
    name?: string;
    type?: string;
    placeholder: string;
    autoComplete?: string;
    readOnly?: boolean;
    passive?: boolean;
    onClick?: () => void;
    value?: string | number | readonly string[];
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    'aria-label'?: string;
    icon?: LucideIcon;
    borderless?: boolean;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ id, name, type, placeholder, autoComplete, readOnly, passive, onClick, value, onChange, required, onFocus, onKeyDown, 'aria-label': ariaLabel, icon: Icon, borderless, ...props }, ref) => (
        <div className="relative">
            {Icon && (
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Icon size={18} className="text-gray-400" />
                </div>
            )}
            <input
                ref={ref}
                id={id}
                name={name}
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                readOnly={readOnly}
                onClick={onClick}
                value={value}
                onChange={onChange}
                required={required}
                onFocus={onFocus}
                onKeyDown={onKeyDown}
                aria-label={ariaLabel}
                {...props}
                className={`block w-full max-h-8 rounded-md border-0 py-2 ${Icon ? 'pl-8 pr-4' : 'px-3'} text-gray-900 ${borderless ? '' : 'shadow-xs ring-1 ring-inset ring-gray-300'} placeholder:text-gray-400 sm:text-sm sm:leading-6 ${borderless ? 'focus:outline-hidden' : passive ? 'focus:outline-hidden focus:ring-1 focus:ring-gray-300' : 'focus:ring-2 focus:ring-inset focus:ring-amber-600'}`}
            />
        </div>
    )
);

Input.displayName = 'Input';

export default Input;
