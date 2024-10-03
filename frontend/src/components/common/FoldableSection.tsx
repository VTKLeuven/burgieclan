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
                className="cursor-pointer bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-900 capitalize"
                onClick={toggleSection}
            >
                {title}
            </h2>
            {isOpen && (
                <div className="content mt-2 text-sm text-gray-800">
                    {children}
                </div>
            )}
        </div>
    );
}