'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/utils/api';

/**
 * This is a temporary component that shows how to use the apiClient to request data from the backend.
 * It should be removed later.
 *
 * TODO: remove after apiClient is used in other places
 */
const Page: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await apiClient('GET', '/api/users/1');
                setData(result);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchData();
    }, []);

    if (error) {
        return <div>{error}</div>;
    }

    if (!data) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <p>Data: {JSON.stringify(data)}</p>
        </div>
    );
};

export default Page;
