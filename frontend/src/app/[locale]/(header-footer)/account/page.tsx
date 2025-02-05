import initTranslations from "@/app/i18n";

export default async function AccountPage({ params: { locale } }: { params: { locale: string } }) {
    const { t } = await initTranslations(locale);

    return (
        <main>
            {t('account')}
        </main>
    );
}
