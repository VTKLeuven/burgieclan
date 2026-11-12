'use client'

import { Transition } from '@headlessui/react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Message Component
const ToastMessage = ({ message, type }: { message: string; type: ToastType }) => {
    // Dopl toast: a white card with a coloured icon; the colour is never the only signal.
    const styles = {
        success: { icon: 'text-success' },
        error: { icon: 'text-danger' },
    }[type];

    const Icon = type === 'error' ? AlertCircle : CheckCircle;

    return (
        <Transition
            appear
            show={true}
            enter="transform ease-out duration-200 transition"
            enterFrom="translate-y-1 opacity-0"
            enterTo="translate-y-0 opacity-100"
            leave="transition ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
        >
            <div
                className="inline-flex max-w-[min(420px,calc(100vw-2rem))] items-center gap-2.5 rounded-card border border-border bg-surface px-3.5 py-2.5 shadow-popover"
                role="alert"
            >
                <Icon className={`size-4 shrink-0 ${styles.icon}`} aria-hidden="true" />
                <p className="m-0 text-body font-medium text-fg">
                    {message}
                </p>
            </div>
        </Transition>
    );
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 left-4 z-[70] flex flex-col items-start gap-2">
                {toasts.map(toast => (
                    <ToastMessage
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// Custom Hook
export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}