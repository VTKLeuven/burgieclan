import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import type React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

const sizes = {
    xs: 'sm:max-w-xs',
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
}

/**
 * A dialog modal that shows information in pop-up form
 */
export function Dialog({
       isOpen,
       onClose,
       size = 'lg',
       className,
       children,
       ...props
}: {isOpen: boolean, onClose: () => void, size?: keyof typeof sizes; className?: string; children: React.ReactNode} & Omit<
    Headless.DialogProps<any>,
    'as' | 'className'
>) {
    return (
        <Headless.Dialog open={isOpen} onClose={onClose} {...props}>
            <Headless.Dialog.Backdrop
                transition
                className="fixed inset-0 backdrop-blur-sm bg-gray-500 bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-700 data-[leave]:duration-500 data-[enter]:ease-out data-[leave]:ease-in" />

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <Headless.Dialog.Panel
                        transition
                        className={clsx(
                            className,
                            sizes[size],
                            "relative transform overflow-hidden rounded-3xl bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
                        )}
                    >
                        <DialogCloseButton onClose={onClose} />
                        {children}
                    </Headless.Dialog.Panel>
                </div>
            </div>
        </Headless.Dialog>
    )
}

/**
 * A title for a dialog modal
 */
export function DialogTitle({className, children}: { className?: string; children: React.ReactNode }) {
    return (
        <Headless.Dialog.Title
            as="h3"
            className={clsx(className, 'px-10')}
        >
            {children}
        </Headless.Dialog.Title>
    )
}

/**
 * A body of a dialog modal, takes any div props except for 'ref'
 */
export function DialogBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
    return <div {...props} className={clsx(className, 'mt-6 px-10')} />
}

/**
 * Component that takes and displays the actions for a dialog modal, takes any div props except for 'ref'
 */
export function DialogActions({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
    return (
        <div
            {...props}
            className={clsx(
                className,
                'mt-4 flex flex-col-reverse items-center justify-end gap-3 *:w-full sm:flex-row sm:*:w-auto px-10'
            )}
        />
    )
}

export function DialogCloseButton({ onClose }: { onClose: () => void }) {
    return (
        <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-gray-700 justify-center items-center flex"
        >
            <span className="sr-only">Close menu</span>
            <XMarkIcon aria-hidden="true" className="h-6 w-6"/>
        </button>
    )
}
