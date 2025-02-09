'use client';

import React, {useEffect, useState} from 'react'
import Image from 'next/image';
import YellowOpenButton from '/public/images/icons/yellow_open_button.svg';
import NotificationIcon from '/public/images/icons/notification_icon.svg';
import NotificationModal from '@/components/notifications/NotificationModal'

export default function NotificationList(){
    type NotificationProps = {
        title: string;
        detail: string;
        status: number;
    };

    /*const [notifications, setNotifications] = useState<NotificationProps[]>([]);
    const [page, setPage] = useState<any>(null);
    const [error, setError] = useState<ApiClientError | null>(null);

    useEffect(() => {
        const FetchData = async () => {
            try {
                const result = await ApiClient('GET', `/api/notifications`);
                console.log(result);
                console.log(typeof result);
                setPage(result);
            } catch (err: any) {
                setError(err);
            }
        };

        FetchData();
    });

    if (error) {
        return <ErrorPage status={error.status} />;
    }*/

    const Notification: React.FC<NotificationProps> = ({ title, detail, status}) => {
        const [isModalOpen, setIsModalOpen] = React.useState(false);

        const truncateText = (text: string, maxLength: number) => {
            if (text.length > maxLength) {
                return text.substring(0, maxLength) + '...';
            }
            return text;
        };

        return (
            <div className="grid grid-cols-[50px_1fr_50px] pt-2 pb-2 h-[70px]">
                <div className="flex justify-center items-center justify-self-start ml-1">
                    <Image src={NotificationIcon} alt="Notification Icon" className="h-[22px] w-[22px]"/>
                </div>

                <div className="grid">
                    <p className="text-lg font-semibold mb-0 text-wireframe-darkest-gray">{title}</p>
                    <p className="text-sm mt-0 text-wireframe-mid-gray font-roboto">
                        {truncateText(detail, 23)}
                    </p>
                </div>

                <div className="flex justify-center items-center justify-self-end mr-1 hover:cursor-pointer"
                     onClick={() => setIsModalOpen(true)}>
                    <Image src={YellowOpenButton} alt="Yellow open button" className="h-[35px] w-[35px]"/>
                </div>

                <NotificationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                    <div>
                        <h2 className="text-xl font-bold mb-4">{title}</h2>
                        <p>{detail}</p>
                    </div>
                </NotificationModal>
            </div>
        );
    };

    return (
        <div>
            {/*notifications.map((notification: NotificationProps, index: React.Key | null | undefined) => (
                <Notification key={index} title={notification.title} detail={notification.detail} status={notification.status}/>
            ))*/}
            <Notification title="Notification 1" detail="Lorem ipsum dolor sit amet" status={200} />
            <Notification title="Notification 2" detail="Consectetur adipiscing elit" status={200} />
            <Notification title="Notification 3" detail="Sed do eiusmod tempor incididunt" status={200} />
            <Notification title="Notification 4" detail="Ut labore et dolore magna aliqua" status={200} />
        </div>
    )
}