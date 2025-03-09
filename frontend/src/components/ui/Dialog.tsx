import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import React from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next';

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

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    size?: keyof typeof sizes;
    className?: string;
    children?: React.ReactNode;
}

export function Dialog({ isOpen, onClose, size = 'lg', className, children }: DialogProps) {
    return (
        <Headless.Transition appear show={isOpen} as={React.Fragment}>
            <Headless.Dialog
                as="div"
                className="relative z-10"
                onClose={() => onClose()}
                open={isOpen}
            >
                <Headless.Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 backdrop-blur-sm bg-gray-500 bg-opacity-75" />
                </Headless.Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Headless.Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Headless.Dialog.Panel
                                className={clsx(
                                    className,
                                    sizes[size],
                                    "relative transform overflow-hidden rounded-3xl bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:p-6 w-full"
                                )}
                            >
                                <DialogCloseButton onClose={onClose} />
                                {children}
                            </Headless.Dialog.Panel>
                        </Headless.Transition.Child>
                    </div>
                </div>
            </Headless.Dialog>
        </Headless.Transition>
    )
}

interface DialogTitleProps {
    className?: string;
    children: React.ReactNode;
}

export function DialogTitle({ className, children }: DialogTitleProps) {
    return (
        <Headless.Dialog.Title
            as="h3"
            className={clsx(className, 'px-10')}
        >
            {children}
        </Headless.Dialog.Title>
    )
}

interface DialogBodyProps extends React.ComponentPropsWithoutRef<'div'> {
    className?: string;
}

export function DialogBody({ className, ...props }: DialogBodyProps) {
    return <div {...props} className={clsx(className, 'mt-6 px-10')} />
}

interface DialogActionsProps extends React.ComponentPropsWithoutRef<'div'> {
    className?: string;
}

export function DialogActions({ className, ...props }: DialogActionsProps) {
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

interface DialogCloseButtonProps {
    onClose: () => void;
}

export function DialogCloseButton({ onClose }: DialogCloseButtonProps) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-gray-700 justify-center items-center flex"
        >
            <span className="sr-only">{t('dialog.close')}</span>
            <X aria-hidden="true" className="h-6 w-6" />
        </button>
    )
}