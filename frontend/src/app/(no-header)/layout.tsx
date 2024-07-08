import "@/app/globals.css";
import React from "react";

export default function NoHeaderLayout({children,}: Readonly<{ children: React.ReactNode; }>) {
    return (
        <>
            {children}
        </>
    );
}