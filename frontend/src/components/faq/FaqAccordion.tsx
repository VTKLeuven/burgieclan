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
        <div className="flex flex-col gap-3">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    className="vtk-panel overflow-hidden transition-all duration-200"
                >
                    <button
                        onClick={() => toggle(index)}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-vtk-paper/60"
                        aria-expanded={openIndex === index}
                    >
                        <span className="text-[15px] font-semibold leading-snug text-vtk-ink">
                            {item.question}
                        </span>
                        <ChevronDown
                            className={`h-5 w-5 shrink-0 text-vtk-muted transition-transform duration-300 ${
                                openIndex === index ? 'rotate-180' : ''
                            }`}
                            aria-hidden="true"
                        />
                    </button>
                    <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                            openIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        }`}
                    >
                        <div className="overflow-hidden">
                            <div
                                className="border-t border-vtk-line px-6 pb-5 pt-4 text-[14px] leading-relaxed text-vtk-body"
                                dangerouslySetInnerHTML={{ __html: item.answer || '' }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
