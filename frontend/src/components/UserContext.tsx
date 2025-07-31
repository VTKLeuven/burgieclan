"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import type { User } from '@/types/entities';
import { convertToUser } from '@/utils/convertToEntity';
import { notFound } from 'next/navigation';
import type { ApiError } from '@/utils/error/apiError';

interface UserContextType {
    user: User | null;
    loading: boolean;
    isRedirecting: boolean;
    error: ApiError | null;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children, userId }: { children: ReactNode, userId: number | null }) => {
    const [user, setUser] = useState<User | null>(null);
    const { loading, error, isRedirecting, request } = useApi();

    const fetchUser = useCallback(async () => {
        if (!userId) {
            setUser(null);
            return;
        }


        const userData = await request('GET', `/api/users/${userId}`);
        if (userData && !userData.error) {
            setUser(convertToUser(userData));
        } else {
            notFound();
        }
    }, [userId, request]);

    // Initial fetch when component mounts or userId changes
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const contextValue: UserContextType = {
        user,
        loading,
        isRedirecting,
        error,
        refreshUser: fetchUser
    };

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};