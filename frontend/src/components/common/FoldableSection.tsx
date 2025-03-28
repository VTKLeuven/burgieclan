import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

type FoldableSectionProps = {
    title: string;
    defaultOpen: boolean;
    children: React.ReactNode;
};

export default function FoldableSection({ title, defaultOpen, children }: FoldableSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const toggleSection = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="foldable-section">
            <h2
                className="cursor-pointer bg-gray-100 px-4 py-2.5 my-0 text-xs font-semibold text-gray-900 capitalize flex items-center justify-between"
                onClick={toggleSection}
            >
                <span>{title}</span>
                <ChevronDown
                    className={`h-4 w-4 transform transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'
                        }`}
                    aria-hidden="true"
                />
            </h2>
            <div
                className={`transition-all duration-200 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="content mt-2 text-sm text-gray-800">
                    {children}
                </div>
            </div>
        </div>
    );
}