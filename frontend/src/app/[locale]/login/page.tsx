import initTranslations from "@/app/i18n";
import LoginForm from "@/components/login/LoginForm";
import TranslationsProvider from "@/components/TranslationProvider";

export default async function Page({ params: { locale } }: { params: { locale: string } }) {
    const { t, resources } = await initTranslations(locale);

    return (
        <TranslationsProvider
            locale={locale}
            resources={resources}>
            < LoginForm />
        </TranslationsProvider>
    );
}