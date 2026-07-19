import Image from "next/image";
import { useTranslation } from "react-i18next";

interface LitusOAuthButtonProps {
    loginHandler: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const LitusOAuthButton = ({ loginHandler }: LitusOAuthButtonProps) => {
    const { t } = useTranslation();
    return (
        <button
            type="submit"
            onClick={loginHandler}
            className="vtk-button vtk-button-subtle w-full"
        >
            <Image
                src="/images/logos/vtk-logo-blue.png"
                alt=""
                width={50}
                height={25}
                className="h-4 w-auto object-contain"
            />
            {t('login_vtk')}
        </button>
    )
}

export default LitusOAuthButton;