import React, {useEffect} from "react";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {initiateLitusOAuthFlow} from "@/utils/oauth";


const LitusOAuthButton = () => {
    const router = useRouter();

    const handleLoginClick = (event: { preventDefault: () => void; }) => {
        event.preventDefault();
        initiateLitusOAuthFlow(router);
    };

    return (
        <div className="mt-10 w-full max-w-sm">
            <button
                type="submit"
                onClick={handleLoginClick}
                className="flex flex-row w-full justify-center items-center rounded-md border-0 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-300 font-semibold leading-6 text-black shadow-sm hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-vtk-blue-400"
            >
                <Image
                    src="/images/logos/vtk-logo-blue.png"
                    alt="VTK Logo"
                    width={50}
                    height={25}
                    className="p-2 pb-3"
                />
                <p className="inline p-2 text-vtk-blue-500">Log in with VTK</p>
            </button>
        </div>
    )
}

export default LitusOAuthButton;