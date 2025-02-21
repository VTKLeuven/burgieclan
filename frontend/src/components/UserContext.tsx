"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiClient } from "@/actions/api";
import { ApiError } from "@/utils/error/apiError";
import type { User } from '@/types/entities';
import { convertToUser } from '@/utils/convertToEntity';

interface UserContextType {
    user: User | null;
    loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children, userId }: { children: ReactNode, userId: number | null }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUser() {
            try {
                if (!userId) {
                    return;
                }
                const userData = await ApiClient('GET', `/api/users/${userId}`);
                if (userData?.error) {
                    throw new ApiError(userData.error.message, userData.error.status);
                }
                setUser(convertToUser(userData));
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchUser();
    }, [userId]);

    return (
        <UserContext.Provider value={{ user, loading }}>
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