import Image from "next/image";
import React from "react";

export default function Logo({ width, height }: { width: number; height: number }) {
    return (
        <Image
            src="/images/logos/burgieclan-logo.png"
            alt="Burgieclan Logo"
            width={width}
            height={height}
            className="mx-auto"
        />
    )
}
