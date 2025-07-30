import React, { forwardRef } from 'react';
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
};

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ id, name, type, placeholder, autoComplete, readOnly, passive, onClick }, ref) => (
        <input
            ref={ref}
            id={id}
            name={name}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            readOnly={readOnly}
            onClick={onClick}
            className={`block w-full max-h-8 rounded-sm border-0 py-1.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6 ${passive ? 'focus:outline-none focus:ring-1 focus:ring-gray-300' : 'focus:ring-2 focus:ring-inset focus:ring-indigo-600'}`}
        />
    )
);

Input.displayName = 'Input';

export default Input;
