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
    headerClassName = ""
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
                    className={`flex h-7 w-full cursor-pointer items-center justify-between rounded-[8px] px-2 text-left text-caption font-medium text-fg-muted hover:text-fg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus ${headerClassName}`}
                >
                    <span>{title}</span>
                    <ChevronDown
                        className={`size-3.5 transform transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'
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
                <div className="content text-body text-fg">
                    {children}
                </div>
            </div>
        </div>
    );
}