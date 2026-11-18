'use client';

import { FaqItem } from '@/types/entities';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FaqAccordionProps {
    items: FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="vtk-list">
            {items.map((item, index) => (
                <div key={item.id}>
                    <button
                        onClick={() => toggle(index)}
                        className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                        aria-expanded={openIndex === index}
                    >
                        <span className="text-body font-medium text-fg">
                            {item.question}
                        </span>
                        <ChevronDown
                            className={`size-4 shrink-0 text-icon transition-transform duration-200 ${
                                openIndex === index ? 'rotate-180' : ''
                            }`}
                            aria-hidden="true"
                        />
                    </button>
                    <div
                        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                            openIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        }`}
                    >
                        <div className="overflow-hidden">
                            <div
                                className="vtk-prose px-4 pb-4"
                                dangerouslySetInnerHTML={{ __html: item.answer || '' }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
