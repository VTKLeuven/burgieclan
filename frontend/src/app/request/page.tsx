'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/utils/api';

const HomePage: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await apiClient('GET', '/api/users/1');
                setData(result);
            } catch (err) {
                // @ts-ignore
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
            <h1>Welcome to the Home Page</h1>
            <p>Data: {JSON.stringify(data)}</p>
        </div>
    );
};

export default HomePage;
