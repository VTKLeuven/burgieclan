// components/ui/StatusMessage.tsx
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { Text } from '@/components/ui/Text';
import { Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface MessageProps {
    message: string;
    type: 'error' | 'success';
}

export const StatusMessage = ({ message, type }: MessageProps) => {
    const styles = {
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: 'text-red-400'
        },
        success: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-700',
            icon: 'text-green-400'
        }
    }[type];

    const Icon = type === 'error' ? ExclamationCircleIcon : CheckCircleIcon;

    return (
        <Transition
            appear
            show={true}
            as={Fragment}
            enter="transform ease-out duration-300 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
        >
            <div
                className={`rounded-md ${styles.bg} border ${styles.border} p-3 mb-4`}
                role="alert"
            >
                <div className="flex items-center">
                    <Icon
                        className={`h-5 w-5 ${styles.icon} flex-shrink-0`}
                        aria-hidden="true"
                    />
                    <Text className={`ml-2 text-sm ${styles.text}`}>
                        {message}
                    </Text>
                </div>
            </div>
        </Transition>
    );
};