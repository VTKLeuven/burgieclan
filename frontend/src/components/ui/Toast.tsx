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
    // Semantic tones matching `.vtk-basic-badge-success` / `-danger`.
    const styles = {
        success: {
            bg: 'bg-[#eef8ea]',
            border: 'border-[#b8dec1]',
            text: 'text-[#2f6f33]',
            icon: 'text-[#2f6f33]'
        },
        error: {
            bg: 'bg-[#fff0ed]',
            border: 'border-[#f0c6bd]',
            text: 'text-[#9d2f1f]',
            icon: 'text-[#9d2f1f]'
        }
    }[type];

    const Icon = type === 'error' ? AlertCircle : CheckCircle;

    return (
        <Transition
            appear
            show={true}
            enter="transform ease-out duration-300 transition"
            enterFrom="-translate-y-2 opacity-0"
            enterTo="translate-y-0 opacity-100"
            leave="transition ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
        >
            <div
                className={`inline-flex items-center ${styles.bg} border ${styles.border} rounded-2xl px-4 py-2.5 shadow-[0_18px_42px_rgba(10,15,31,0.12)]`}
                role="alert"
            >
                <Icon className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
                <p className={`ml-2 text-sm font-medium ${styles.text}`}>
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
            <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
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