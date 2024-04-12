import React, { useState } from 'react';

const CollapsibleComponent = ({ trigger, content }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleCollapse = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div>
            <div onClick={toggleCollapse} className="cursor-pointer">
                {trigger}
            </div>
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'h-auto' : 'h-0'} overflow-hidden`}>
                {content}
            </div>
        </div>
    );
};

export default CollapsibleComponent;
