import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-regular-svg-icons';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

export default function Announcement({ priority, title, description, datePosted }: { priority: number, title: string, description: string, datePosted: string }) {
    return (
        <div className="flex mt-2 mb-2">
            <div className="flex items-center justify-end mr-4">
                {priority === 2 && <FontAwesomeIcon icon={faBell} size="2x" />}
                {priority === 1 && <FontAwesomeIcon icon={faTriangleExclamation} size="2x" />}
            </div>
            <div className="pl-5 flex flex-col justify-center">
                <h3 className="text-xl text-wireframe-content m-0">{title}</h3>
                <div className="text-wireframe-content" dangerouslySetInnerHTML={{ __html: description }} />
            </div>
            <div className="flex items-center justify-end ml-auto mr-6">
                <span className="text-wireframe-content text-s">{datePosted}</span>
            </div>
        </div>
    );
}