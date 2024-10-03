import React, { forwardRef } from 'react';
import './input.css';

type InputProps = {
    id?: string;
    name?: string;
    type?: string;
    placeholder: string;
    onClick?: () => void;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ id, name, type, placeholder, onClick }, ref) => (
        <input
            ref={ref}
            id={id}
            name={name}
            type={type}
            placeholder={placeholder}
            onClick={onClick}
            className="block w-full max-h-8 rounded-sm border-0 py-1.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
    )
);

Input.displayName = 'Input';

export default Input;
