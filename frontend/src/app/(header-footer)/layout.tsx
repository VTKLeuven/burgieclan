'use client'

import "@/app/globals.css";
import React, { useEffect, useState } from "react";
import Header from "@/components/header/Header";
import { hasJwt } from "@/actions/oauth";
import Footer from "@/components/footer/Footer";
import Sidebar from "@/components/sidebar/Sidebar";
import {Bars3Icon} from "@heroicons/react/24/outline";
import {MagnifyingGlassIcon} from "@heroicons/react/16/solid";
import {BellIcon, Menu} from "lucide-react";
import {ChevronDownIcon} from "@heroicons/react/20/solid";

function MenuButton(props: { className: string, children: ReactNode }) {
    return null;
}

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
            <div className="flex flex-col h-screen">
                <Header isAuthenticated={isAuthenticated}/>
                <div className="flex flex-1 ">
                    <Sidebar />
                    <main className="flex flex-1 p-4">
                        {children}
                    </main>
                </div>
                <Footer/>
            </div>
        </>
    );
}