'use client'

import Image from 'next/image';

interface CoursePageSectionProps {
    title: string;
    description: string;
}

export default function CoursePageSection({ title, description }: CoursePageSectionProps) {

    const YellowSectionButton = () => (
        <div className="pt-10 pb-5">
            <span className="bg-wireframe-primary-panache rounded-[5px] p-2 hover:underline hover:cursor-pointer">Button</span>
        </div>
    );

    return (
        <>
            <div className="border border-[#E3E3E3] hover:border-wireframe-primary-blue rounded-[14.57px] transform hover:scale-[1.03] transition-transform duration-300">
                <div className="pl-4 pt-2">
                    <Image src="/images/vectors/document_icon.svg" alt="Document Icon" width={32} height={32} className="w-8 h-8" />

                    <h3 className="hover:underline hover:cursor-pointer">{title}</h3>
                    <p className="text-s w-[85%]">
                        {description}
                    </p>
                    <YellowSectionButton />
                </div>
            </div>
        </>
    )
}