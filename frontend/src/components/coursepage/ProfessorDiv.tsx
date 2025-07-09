import { useEffect, useState } from 'react'
import Image from 'next/image'
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function ProfessorDiv({ unumber, index, t }: { unumber: string, index: number, t: TFunction }) {
    const { i18n } = useTranslation();
    const locale = i18n.language || 'en';

    const sanitizedUnumber = unumber.replace(/\D/g, '').padStart(7, '0').slice(-7);
    const [imgSrc, setImgSrc] = useState(`https://www.kuleuven.be/wieiswie/nl/person/0${sanitizedUnumber}/photo`);
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
                console.error("Error fetching professor name:", error);
            }
            return "N.";
        }

        async function loadProfessorName() {
            const name = await fetchProfessorName();
            setProfessorName(name);
        }
        loadProfessorName();
    }, [sanitizedUnumber]);

    const handleError = () => {
        setImageError(true);
    };

    // Get initials for fallback
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Generate a consistent color based on the name
    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-blue-500',
            'bg-green-500', 
            'bg-purple-500',
            'bg-pink-500',
            'bg-indigo-500',
            'bg-yellow-500',
            'bg-red-500',
            'bg-teal-500'
        ];
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const roleText = index === 0 ? t('course-page.coordinator') : t('course-page.professor');

    return (
        <div className="relative group">
            <Link href={`https://www.kuleuven.be/wieiswie/${locale}/person/0${sanitizedUnumber}`}>
                {!imageError ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 cursor-pointer relative z-10 group-hover:z-20">
                        <Image
                            src={imgSrc}
                            onError={handleError}
                            className="w-full h-full object-cover"
                            alt={professorName}
                            width={48}
                            height={48}
                        />
                    </div>
                ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium border-2 border-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 cursor-pointer relative z-10 group-hover:z-20 ${getAvatarColor(professorName)}`}>
                        {getInitials(professorName)}
                    </div>
                )}
            </Link>

            {/* Tooltip on hover - appears below */}
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
                <div className="font-medium">{professorName}</div>
                <div className="text-gray-300">{roleText}</div>
                {/* Arrow pointing up */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-b-gray-900"></div>
            </div>
        </div>
    );
};