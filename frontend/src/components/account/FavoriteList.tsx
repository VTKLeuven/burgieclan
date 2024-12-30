import React from 'react';

interface FavoriteListProps {
    title: string;
    items: { name: string }[];
    emptyMessage: string;
}

const FavoriteList: React.FC<FavoriteListProps> = ({ title, items, emptyMessage }) => {
    return (
        <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4">{title}</h3>
            {items && items.length > 0 ? (
                <ul className="space-y-4">
                    {items.map((item, index) => (
                        <li key={index} className="bg-gray-200 p-2 rounded-md shadow-sm">
                            {item.name}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-700">{emptyMessage}</p>
            )}
        </div>
    );
};

export default FavoriteList;