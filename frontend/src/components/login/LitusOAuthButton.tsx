import Image from "next/image";
import { useTranslation } from "react-i18next";

interface LitusOAuthButtonProps {
    loginHandler: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const LitusOAuthButton = ({ loginHandler }: LitusOAuthButtonProps) => {
    const { t } = useTranslation();
    return (
        <div className="mt-10 w-full max-w-sm">
            <button
                type="submit"
                onClick={loginHandler}
                className="flex flex-row w-full justify-center items-center rounded-md border-0 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-300 font-semibold leading-6 text-black shadow-xs hover:bg-neutral-50 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-vtk-blue-400"
            >
                <Image
                    src="/images/logos/vtk-logo-blue.png"
                    alt="VTK Logo"
                    width={50}
                    height={25}
                    className="p-2 pb-3"
                />
                <p className="inline p-2 text-vtk-blue-500">{t('login_vtk')}</p>
            </button>
        </div>
    )
}

export default LitusOAuthButton;