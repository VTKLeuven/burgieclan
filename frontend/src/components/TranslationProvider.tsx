'use client';

import { I18nextProvider } from 'react-i18next';
import initTranslations from '@/app/i18n';
import { createInstance, type Resource } from 'i18next';

import { ReactNode } from 'react';

interface TranslationsProviderProps {
  children: ReactNode;
  locale: string;
  resources: Resource;
}

export default function TranslationsProvider({
  children,
  locale,
  resources
}: TranslationsProviderProps) {
  const i18n = createInstance();

  initTranslations(locale, i18n, resources);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}