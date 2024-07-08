import "@/app/globals.css";
import React from "react";
import Header from "@/components/header/Header";

export default function HeaderLayout({children,}: Readonly<{ children: React.ReactNode; }>) {
  return (
      <>
        <Header />
        {children}
      </>
  );
}