"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiClient } from "@/actions/api";
import { ApiError } from "@/utils/error/apiError";
import type { User } from '@/types/entities';

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
                    throw new ApiError("User not found", 404);
                }
                const userData = await ApiClient('GET', `/api/users/${userId}`);
                const convertedUserData: User = {
                    id: parseInt(userData['@id'].split('/').pop()),
                    fullName: userData.fullName,
                    username: userData.username,
                    email: userData.email,
                    favoriteCourses: userData.favoriteCourses.map((course: any) => ({
                        id: parseInt(course['@id'].split('/').pop()),
                        name: course.name,
                        code: course.code,
                    })),
                    favoriteModules: userData.favoriteModules.map((module: any) => ({
                        id: parseInt(module['@id'].split('/').pop()),
                        name: module.name,
                    })),
                    favoritePrograms: userData.favoritePrograms.map((program: any) => ({
                        id: parseInt(program['@id'].split('/').pop()),
                        name: program.name,
                    })),
                    favoriteDocuments: userData.favoriteDocuments.map((document: any) => ({
                        id: parseInt(document['@id'].split('/').pop()),
                        name: document.name,
                    }))
                };
                setUser(convertedUserData);
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