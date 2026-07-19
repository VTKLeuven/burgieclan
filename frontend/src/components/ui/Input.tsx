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
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icon size={16} className="text-vtk-muted" />
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
                className={`vtk-input block ${Icon ? 'pl-9' : ''} ${borderless ? 'border-0 bg-transparent focus:shadow-none' : ''} ${passive ? 'cursor-pointer' : ''}`}
            />
        </div>
    )
);

Input.displayName = 'Input';

export default Input;
