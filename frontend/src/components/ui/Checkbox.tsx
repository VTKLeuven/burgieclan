import React, { forwardRef, useId } from 'react';

/**
 * Props for the Checkbox component.
 * Extends standard HTML input props (excluding 'type') and adds custom props.
 */
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    /** Text label to display next to the checkbox */
    label: string;
    /** Optional CSS classes to apply to the container div */
    className?: string;
}

/**
 * A reusable checkbox component that can be used both standalone and with form libraries.
 *
 * @component
 * @example
 * // Basic usage
 * <Checkbox label="Remember me" onChange={handleChange} />
 *
 * @example
 * // Usage with React Hook Form
 * <Checkbox
 *   label="Subscribe to newsletter"
 *   {...register('subscribe')}
 *   disabled={isLoading}
 * />
 *
 * @example
 * // With custom styling
 * <Checkbox
 *   label="Accept terms"
 *   className="justify-end"
 *   required
 * />
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
    label,
    className,
    id: propId,
    ...props
}, ref) => {
    // Generate a unique ID if one isn't provided
    const generatedId = useId();
    const id = propId || `checkbox-${generatedId}`;

    return (
        <div className={`flex items-center ${className}`}>
            <input
                id={id}
                type="checkbox"
                ref={ref}
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
                {...props}
            />
            <label
                htmlFor={id}
                className="ml-2 block text-sm font-medium text-gray-900 cursor-pointer"
            >
                {label}
            </label>
        </div>
    );
});

// Add display name for better debugging experience
Checkbox.displayName = 'Checkbox';

/*
 * Component Features:
 * - Fully accessible with keyboard navigation
 * - Compatible with React Hook Form through ref forwarding
 * - Supports all standard HTML checkbox attributes
 * - Customizable appearance through className prop
 * - Tailwind styling with amber accent color
 * - Clickable label toggling the checkbox state
 *
 * Accessibility Improvements:
 * - Label associated with checkbox via htmlFor/id
 * - Cursor changes to pointer when hovering over label
 * - Larger hit area for better usability
 *
 * Styling Classes:
 * - Container: flex items-center
 * - Checkbox: h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded
 * - Label: ml-2 block text-sm font-medium text-gray-900 cursor-pointer
 *
 * Usage with React Hook Form:
 * The component is designed to work seamlessly with React Hook Form.
 * It forwards the ref and spreads additional props to enable form integration.
 * Default values can be set through the form's defaultValues option.
 */