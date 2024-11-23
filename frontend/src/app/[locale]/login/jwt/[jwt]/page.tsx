import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storeOAuthTokens } from "@/actions/oauth";
import ErrorPage from "@/components/error/ErrorPage";
import TranslationsProvider from "@/components/TranslationProvider";
import initTranslations from "@/app/i18n";

/**
 * Component allows for manually storing jwt as a http-only cookie. Can be used later to authenticate requests to the backend.
 */
export default async function Page({ params: { locale, jwt } }: { params: { locale: string, jwt: string } }) {
    const router = useRouter();
    const [error, setError] = useState<Error | null>(null);

    const { t, resources } = await initTranslations(locale);

    useEffect(() => {
        (async () => {
            try {
                // Put JWT in Http-only cookie for session management
                await storeOAuthTokens(jwt);
                router.push('/');
            } catch (error) {
                setError(error);
            }
        })();
    }, [jwt, router]);

    if (error) {
        return (
            <TranslationsProvider
                locale={locale}
                resources={resources}>
                <ErrorPage />
            </TranslationsProvider>
        );
    }
}