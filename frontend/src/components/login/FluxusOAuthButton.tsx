import Image from "next/image";
import { useTranslation } from "react-i18next";

interface FluxusOAuthButtonProps {
    loginHandler: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const FluxusOAuthButton = ({ loginHandler }: FluxusOAuthButtonProps) => {
    const { t } = useTranslation();
    return (
        <button
            type="submit"
            onClick={loginHandler}
            className="vtk-button vtk-button-primary h-10 w-full"
        >
            <Image
                src="/images/logos/vtk-logo-white.png"
                alt=""
                width={50}
                height={25}
                // White on the navy button; on the near-white one in dark mode it goes dark,
                // like the label beside it.
                className="h-4 w-auto object-contain dark:brightness-0"
            />
            {t('login_vtk')}
        </button>
    )
}

export default FluxusOAuthButton;