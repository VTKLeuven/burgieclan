import Image from "next/image";
import React from "react";

export default function Logo({ width, height }: { width: number; height: number }) {
    return (
        // Navy VTK mark for light surfaces; the header/footer use the white
        // variant directly since they sit on the navy band.
        <Image
            src="/images/logos/vtk-logo-blue.png"
            alt="Burgieclan Logo"
            width={width}
            height={height}
            className="h-auto w-auto object-contain"
        />
    )
}