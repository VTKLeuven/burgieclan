'use client'

import "@/app/globals.css";
import React, {useEffect, useState} from "react";
import Header from "@/components/header/Header";
import {hasJwt} from "@/utils/oauth";
import Footer from "@/components/footer/Footer";

export default function HeaderLayout({children,}: Readonly<{ children: React.ReactNode }>) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                const authenticated = await hasJwt();
                setIsAuthenticated(authenticated);
            } catch (error) {
                throw Error('Error checking authentication status:', error);
            }
        };

        checkAuthentication();
    }, []);

    return (
        <>
            <div className="flex h-full flex-col min-h-full">
                <Header isAuthenticated={isAuthenticated} />
                <div className="grow">
                    {children}
                </div>
                <Footer />
            </div>
        </>
    );
}