import React from "react";

// TODO: check if args should be text instead
export default function Button({children} : {children: React.ReactNode}) {
    return (
        <button
            type="button"
            className="rounded-md bg-white px-3 py-2 text-primary font-medium shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
        >
            {children}
        </button>
    )
}