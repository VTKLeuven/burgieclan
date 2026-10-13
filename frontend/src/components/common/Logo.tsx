import Image from "next/image";
import React from "react";

export default function Logo({ width, height }: { width: number; height: number }) {
    return (
        // Navy Burgieclan cloud mark for light surfaces; header uses the mask
        // variant and footer uses the white variant since they sit on the navy band.
        <Image
            src="/images/logos/burgieclan-cloud-navy.png"
            alt="Burgieclan Logo"
            width={width}
            height={height}
            className="h-auto w-auto object-contain"
        />
    )
}