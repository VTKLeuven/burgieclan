'use client'

import { captureException } from '@sentry/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ProfessorDivProps {
    unumber: string;
    /** Index in the list — 0 means coordinator. */
    index: number;
    /** Pixel size of the avatar circle (default 48). */
    size?: number;
    /** Whether to link the avatar to the wieiswie profile page (default true). */
    linkToProfile?: boolean;
}

function getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

// Fallback avatars stay on the navy scale rather than introducing a rainbow
// of accent colours; only the tone varies per person.
function getAvatarColor(name: string): string {
    const tones = [
        'bg-vtk-navy text-vtk-paper',
        'bg-vtk-ink text-vtk-paper',
        'bg-vtk-blue-light text-vtk-paper',
        'bg-vtk-yellow text-vtk-ink',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return tones[hash % tones.length];
}

export default function ProfessorDiv({
    unumber,
    index,
    size = 48,
    linkToProfile = true,
}: ProfessorDivProps) {
    const { i18n, t } = useTranslation();
    const locale = i18n.language || 'en';

    const sanitizedUnumber = unumber.replace(/\D/g, '').padStart(7, '0').slice(-7);
    const imgSrc = `https://www.kuleuven.be/wieiswie/nl/person/0${sanitizedUnumber}/photo`;
    const [professorName, setProfessorName] = useState("N.");
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        async function fetchProfessorName(): Promise<string> {
            try {
                const response = await fetch(`https://dataservice.kuleuven.be/employee/_doc/0${sanitizedUnumber}`);

                const data = await response.json();
                if (data._source?.firstName && data._source?.surname) {
                    return `${data._source.firstName[0]}. ${data._source.surname}`;
                }
            } catch (error) {
                captureException(
                    error instanceof Error ? error : new Error(String(error)),
                    {
                        extra: { context: "Error fetching professor name" },
                    }
                );
            }
            return "N.";
        }

        async function loadProfessorName() {
            const name = await fetchProfessorName();
            setProfessorName(name);
        }
        loadProfessorName();
    }, [sanitizedUnumber]);

    const roleText = index === 0 ? t('course-page.coordinator') : t('course-page.professor');
    const borderClass = size < 36 ? 'border border-white' : 'border-2 border-white';

    const avatarContent = !imageError ? (
        <div
            className={`rounded-full overflow-hidden bg-vtk-paper-2 ${borderClass} shadow-xs
                ${linkToProfile ? 'hover:shadow-md transition-all duration-200 hover:scale-110 cursor-pointer' : ''}
                relative z-10 group-hover:z-20`}
            style={{ width: size, height: size }}
        >
            <Image
                src={imgSrc}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
                alt={professorName}
                width={size}
                height={size}
            />
        </div>
    ) : (
        <div
            className={`relative z-10 flex items-center justify-center rounded-full ${borderClass} font-semibold shadow-xs
                ${linkToProfile ? 'cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-md' : ''}
                group-hover:z-20 ${getAvatarColor(professorName)}`}
            style={{ width: size, height: size, fontSize: size * 0.28 }}
        >
            {getInitials(professorName)}
        </div>
    );

    const tooltip = (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-vtk-ink text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
            <div className="font-medium">{professorName}</div>
            <div className="text-vtk-on-dark-muted">{roleText}</div>
            {/* Arrow pointing up */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-2 border-transparent border-b-vtk-ink"></div>
        </div>
    );

    const inner = (
        <>
            {avatarContent}
            {tooltip}
        </>
    );

    if (linkToProfile) {
        return (
            <div className="relative group">
                <Link href={`https://www.kuleuven.be/wieiswie/${locale}/person/0${sanitizedUnumber}`}>
                    {inner}
                </Link>
            </div>
        );
    }

    return (
        <div className="relative group">
            {inner}
        </div>
    );
}