'use client';

import { createContext, ReactNode, useContext } from 'react';

/**
 * The language of the programme a course is being listed under.
 *
 * Course titles inside the curriculum navigator follow the *programme*, not the site locale: a
 * Dutch programme lists "Gedistribueerde systemen" even to a reader browsing in English, because
 * that is the course's actual title in that programme. Everywhere outside the navigator — search,
 * favourites, breadcrumbs, a course's own page — there is no programme in context and the reader's
 * own locale is the right choice, so those keep using i18n.language.
 *
 * Passed by context rather than by prop because ModuleNode recurses arbitrarily deep between
 * ProgramNode and CourseRow, and threading it through would mean touching every level.
 */
const ProgramLanguageContext = createContext<string | undefined>(undefined);

export const ProgramLanguageProvider = ({
    language,
    children,
}: {
    language: string | undefined;
    children: ReactNode;
}) => (
    <ProgramLanguageContext.Provider value={language}>{children}</ProgramLanguageContext.Provider>
);

/**
 * The programme language to render course titles in, or undefined outside a programme — in which
 * case callers should fall back to the reader's locale.
 */
export const useProgramLanguage = (): string | undefined => useContext(ProgramLanguageContext);
