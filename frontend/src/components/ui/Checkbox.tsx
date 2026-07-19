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
    /** Optional CSS classes to apply to the label element */
    labelClassName?: string;
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
 *   labelClassName="text-xs text-vtk-body hover:text-vtk-ink transition-colors"
 *   required
 * />
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
    label,
    className,
    labelClassName,
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
                className="h-4 w-4 cursor-pointer rounded accent-vtk-ink"
                {...props}
            />
            <label
                htmlFor={id}
                className={`ml-2 block cursor-pointer ${labelClassName || 'text-sm font-medium text-vtk-ink'}`}
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
 * - Tailwind styling with the ink accent colour
 * - Clickable label toggling the checkbox state
 *
 * Accessibility Improvements:
 * - Label associated with checkbox via htmlFor/id
 * - Cursor changes to pointer when hovering over label
 * - Larger hit area for better usability
 *
 * Styling Classes:
 * - Container: flex items-center
 * - Checkbox: h-4 w-4 rounded accent-vtk-ink
 * - Default Label: ml-2 block text-sm font-medium text-vtk-ink cursor-pointer
 * - Custom Label: Use labelClassName to override the default label styling
 *
 * Usage with React Hook Form:
 * The component is designed to work seamlessly with React Hook Form.
 * It forwards the ref and spreads additional props to enable form integration.
 * Default values can be set through the form's defaultValues option.
 */