"use client";

import { isErrorResponse, useApi } from '@/hooks/useApi';
import type { User } from '@/types/entities';
import { convertToUser } from '@/utils/convertToEntity';
import type { ApiError } from '@/utils/error/apiError';
import { notFound } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

interface UserContextType {
    user: User | null;
    /** Whether this user may open the admin panel. Decided server-side from the JWT roles. */
    isAdmin: boolean;
    loading: boolean;
    isRedirecting: boolean;
    error: ApiError | null;
    refreshUser: () => Promise<void>;
    updateUserProperty: <K extends keyof User>(property: K, value: User[K]) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children, userId, isAdmin = false, initialUser = null }: {
    children: ReactNode;
    userId: number | null;
    isAdmin?: boolean;
    /** The user as the root layout fetched them, raw from the API, so the first paint is already theirs. */
    initialUser?: unknown;
}) => {
    const [user, setUser] = useState<User | null>(() => (userId !== null && initialUser ? convertToUser(initialUser) : null));
    const [loading, setLoading] = useState<boolean>(() => userId !== null && !initialUser);
    const { error, isRedirecting, request } = useApi();

    // A login or logout re-renders the root layout with someone else: take the new initial user
    // over, rather than showing the previous one until a fetch comes back.
    const [shownUserId, setShownUserId] = useState(userId);
    if (shownUserId !== userId) {
        setShownUserId(userId);
        setUser(userId !== null && initialUser ? convertToUser(initialUser) : null);
        setLoading(userId !== null && !initialUser);
    }

    const fetchUser = useCallback(async () => {
        if (!userId) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const userData = await request('GET', `/api/users/${userId}`);
            if (userData && !isErrorResponse(userData)) {
                setUser(convertToUser(userData));
            } else {
                notFound();
            }
        } finally {
            setLoading(false);
        }
    }, [userId, request]);

    const updateUserProperty = useCallback(<K extends keyof User>(property: K, value: User[K]) => {
        setUser(currentUser => {
            if (!currentUser) return null;
            return { ...currentUser, [property]: value };
        });
    }, []);

    // Fetch only when the server could not hand the user over (a backend hiccup, a token that
    // needed refreshing first); otherwise the first paint already has them.
    const hasInitialUser = userId !== null && Boolean(initialUser);
    useEffect(() => {
        if (hasInitialUser) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchUser();
    }, [fetchUser, hasInitialUser]);

    const contextValue: UserContextType = {
        user,
        isAdmin,
        loading,
        isRedirecting,
        error,
        refreshUser: fetchUser,
        updateUserProperty
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