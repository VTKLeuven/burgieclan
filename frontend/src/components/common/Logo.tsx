import Image from "next/image";
import React from "react";

export default function Logo({ width, height }: { width: number; height: number }) {
    const computedWidth = Math.round(height * (1149.34 / 644.19)) || width;
    return (
        // The navy cloud on light surfaces, the white one in dark mode; CSS picks which one shows.
        <>
            <Image
                src="/images/logos/burgieclan-cloud-navy.svg"
                alt="Burgieclan Logo"
                width={computedWidth}
                height={height}
                style={{ height: `${height}px`, width: 'auto' }}
                className="object-contain dark:hidden"
                priority
            />
            <Image
                src="/images/logos/burgieclan-cloud-white.svg"
                alt="Burgieclan Logo"
                width={computedWidth}
                height={height}
                style={{ height: `${height}px`, width: 'auto' }}
                className="hidden object-contain dark:block"
                priority
            />
        </>
    )
}
