import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

type FoldableSectionProps = {
    title: string;
    defaultOpen: boolean;
    children: React.ReactNode;
    headerClassName?: string;
};

export default function FoldableSection({
    title,
    defaultOpen,
    children,
    headerClassName = "bg-vtk-paper-2 text-xs font-semibold text-vtk-ink" // Default styling
}: FoldableSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const sectionId = useId();

    const toggleSection = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="foldable-section">
            <h2 className="my-0">
                <button
                    type="button"
                    onClick={toggleSection}
                    aria-expanded={isOpen}
                    aria-controls={sectionId}
                    className={`w-full cursor-pointer px-4 py-2.5 capitalize flex items-center justify-between text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-vtk-navy ${headerClassName}`}
                >
                    <span>{title}</span>
                    <ChevronDown
                        className={`h-4 w-4 transform transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'
                            }`}
                        aria-hidden="true"
                    />
                </button>
            </h2>
            <div
                id={sectionId}
                inert={!isOpen ? true : undefined}
                className={`transition-all duration-200 ease-in-out overflow-hidden ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="content text-sm text-vtk-ink">
                    {children}
                </div>
            </div>
        </div>
    );
}