import initTranslations from "@/app/i18n";

export default async function Homepage({ params: { locale } }: { params: { locale: string } }) {
  const { t } = await initTranslations(locale);

  return (
    <div>
      {t('homepage')}
    </div>
  );
}
