import Image from "next/image";
import React from "react";

export default function Logo({ width, height }: { width: number; height: number }) {
    const computedWidth = Math.round(height * (1149.34 / 644.19)) || width;
    return (
        // Navy Burgieclan cloud mark for light surfaces; header uses the silver
        // variant and footer uses the white variant since they sit on the navy band.
        <Image
            src="/images/logos/burgieclan-cloud-navy.svg"
            alt="Burgieclan Logo"
            width={computedWidth}
            height={height}
            style={{ height: `${height}px`, width: 'auto' }}
            className="object-contain"
            priority
        />
    )
}