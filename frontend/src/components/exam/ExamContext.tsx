'use client'

import type { ExamSitting } from '@/types/entities';
import { createContext, useContext } from 'react';

export interface ExamEditorContextValue {
    /** The days the exam was given on; each question marks which of them it came up on. */
    sittings: ExamSitting[];
    /** False for a locked exam, a read-only connection, or the static copy shown while loading. */
    editable: boolean;
}

/**
 * What the question node views need beyond their own node. They render inside EditorContent,
 * so a context above it reaches them.
 */
export const ExamEditorContext = createContext<ExamEditorContextValue>({ sittings: [], editable: false });

export const useExamEditor = () => useContext(ExamEditorContext);
