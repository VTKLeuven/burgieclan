import { Announcement as AnnouncementType } from '@/components/announcement/AnnouncementSlideShow';
import { AlertTriangle, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Announcement(props: AnnouncementType) {
    const { priority, title_en, title_nl, content_en, content_nl, createdAt } = props;
    const { i18n } = useTranslation();
    const currentLanguage = i18n.language;

    const title = currentLanguage === 'nl' ? title_nl : title_en;
    const content = currentLanguage === 'nl' ? content_nl : content_en;

    return (
        <div className="flex mt-2 mb-2">
            <div className="flex items-center justify-end mr-4">
                {!priority && <Bell size={32} className="text-wireframe-content" />}
                {priority && <AlertTriangle size={32} className="text-wireframe-content" />}
            </div>
            <div className="pl-5 flex flex-col justify-center">
                <h3 className="text-xl text-wireframe-content m-0">{title}</h3>
                <div className="text-wireframe-content" dangerouslySetInnerHTML={{ __html: content }} />
            </div>
            <div className="flex items-center justify-end ml-auto mr-6">
                <span className="text-wireframe-content text-s">{createdAt}</span>
            </div>
        </div>
    );
}