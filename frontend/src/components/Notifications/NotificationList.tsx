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
            <div className="grid grid-cols-4 gap-2 p-4 h-[100px]">
                <div className="col-span-1 justify-center items-center p-4">
                    <NotificationIcon />
                </div>

                <div className="col-span-2 grid">
                    <div className="">
                        <h4>{title}</h4>
                    </div>
                    <div className="mt-0">
                        {subtext}
                    </div>
                </div>

                <div className="col-span-1 p-4">
                    <YellowOpenButton />
                </div>
            </div>
        );
    };

    return (
        <div className="border border-[#EFF1F7] rounded-md p-4 w-[30%]">
            <Notification title="Notifications" subtext="Lorem ipsum dolor sit amet"/>
            <Notification title="Notifications" subtext="Lorem ipsum dolor sit amet"/>
            <Notification title="Notifications" subtext="Lorem ipsum dolor sit amet"/>
        </div>
    )
}

export default NotificationList;