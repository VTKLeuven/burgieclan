import React from "react";
import YellowOpenButton from '@/public/vectors/yellow_open_button.svg';
import NotificationIcon from '@/public/vectors/notification_icon.svg';


const NotificationList = () => {

    type NotificationProps = {
        title: string;
        subtext: string;
    };

    const numberOfNotifications = 3;

    const Notification: React.FC<NotificationProps> = ({ title, subtext }) => {
        return (
            <div className="grid grid-cols-4 gap-2 p-5 h-[100px]">
                <div className="col-span-1 flex justify-center items-center p-4">
                    <NotificationIcon />
                </div>

                <div className="col-span-2 grid">
                    <h4 className="mb-0 text-wireframe-darkestGrey text-xl">{title}</h4>
                    <p className="mt-0 text-wireframe-midGrey font-roboto text-base">{subtext}</p>
                </div>

                <div className="col-span-1 p-4 flex justify-center items-center">
                    <YellowOpenButton />
                </div>
            </div>
        );
    };

    return (
        <div className="border border-[#EFF1F7] rounded-notificationBorder p-1 w-[30%] m-5">
            <Notification title="Notifications" subtext="Lorem ipsum dolor sit amet"/>
            <Notification title="Notifications" subtext="Lorem ipsum dolor sit amet"/>
            <Notification title="Notifications" subtext="Lorem ipsum dolor sit amet"/>
        </div>
    )
}

export default NotificationList;