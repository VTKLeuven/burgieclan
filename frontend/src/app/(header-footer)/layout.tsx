'use client'

import "@/app/globals.css";
import React, { useEffect, useState } from "react";
import Header from "@/components/header/Header";
import { hasJwt } from "@/actions/oauth";
import Footer from "@/components/footer/Footer";
import ToastProvider from "@/components/ui/Toast";

export default function HeaderLayout({
                                         children,
                                     }: Readonly<{
    children: React.ReactNode
}>) {
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
        // Toast! Toast is a notification that pops up on the surface of the UI to inform the user about the
        // status of an operation
        <ToastProvider>
            <div className="flex h-full flex-col min-h-full">
                <Header isAuthenticated={isAuthenticated} />
                <div className="grow">
                    {children}
                </div>
                <Footer />
            </div>
        </ToastProvider>
    );
}