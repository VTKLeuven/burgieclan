import React from "react";

export default function SolidButton({children} : {children: React.ReactNode}) {
    return (
        <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-white font-medium shadow-sm hover:bg-primary-light transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
            {children}
        </button>
    )
}