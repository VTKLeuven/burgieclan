'use client';

import React, {useEffect, useState} from 'react'
import YellowOpenButton from '@/public/vectors/yellow_open_button.svg';
import NotificationIcon from '@/public/vectors/notification_icon.svg';
import {Notification} from 'pg'
import {ApiClient, ApiClientError} from '@/utils/api'
import ErrorPage from '@/components/error/ErrorPage'


const NotificationList = () => {
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
        return (
            <div className="grid grid-cols-4 gap-2 p-5 h-[100px]">
                <div className="col-span-1 flex justify-center items-center p-4">
                    <NotificationIcon />
                </div>

                <div className="col-span-2 grid">
                    <h4 className="mb-0 text-wireframe-darkestGrey text-xl">{title}</h4>
                    <p className="mt-0 text-wireframe-midGrey font-roboto text-base">{detail}</p>
                </div>

                <div className="col-span-1 p-4 flex justify-center items-center">
                    <YellowOpenButton />
                </div>
            </div>
        );
    };

    return (
        <div className="border border-[#EFF1F7] rounded-notificationBorder p-1 w-[30%] m-5">
            {/*notifications.map((notification: NotificationProps, index: React.Key | null | undefined) => (
                <Notification key={index} title={notification.title} detail={notification.detail} status={notification.status}/>
            ))*/}
            <Notification title="Notifications" detail="Lorem ipsum dolor sit amet" status={200}/>
            <Notification title="Notifications" detail="Lorem ipsum dolor sit amet" status={200}/>
            <Notification title="Notifications" detail="Lorem ipsum dolor sit amet" status={200}/>
        </div>
    )
}

export default NotificationList;