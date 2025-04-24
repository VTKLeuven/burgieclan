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
        setImgSrc('/images/default_prof_pic/generic_profile.png');
    };

    return (
        <div className="flex items-start h-<full">
            <div className="relative w-16 h-16 overflow-hidden rounded-full border border-wireframe-primary-panache">
                <Image
                    src={imgSrc}
                    onError={handleError}
                    className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-auto"
                    alt={unumber}
                    width={64}
                    height={64}
                />
            </div>
            <div className="flex flex-col items-start justify-center ml-4 h-full">
                <Link href={`https://www.kuleuven.be/wieiswie/${locale}/person/0${sanitizedUnumber}`} className="text-lg hover:underline hover:cursor-pointer"> {professorName} </Link>
                {index == 0 && <p className="text-sm text-gray-600"> {t('course-page.coordinator')} </p>}
                {!(index == 0) && <p className="text-sm text-gray-600"> {t('course-page.professor')} </p>}
            </div>
        </div>
    );
};