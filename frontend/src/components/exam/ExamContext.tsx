'use client'

import type { QuestionDiscussion } from '@/components/exam/useQuestionDiscussion';
import type { ExamSitting } from '@/types/entities';
import { createContext, useContext } from 'react';

export interface ExamEditorContextValue {
    /** The exam shown; images fetch their links through it (examImageLinks). */
    examId: number | null;
    /** The days the exam was given on; each question marks which of them it came up on. */
    sittings: ExamSitting[];
    /** False for a locked exam, a read-only connection, or the static copy shown while loading. */
    editable: boolean;
    /**
     * Comments and "Ik had deze ook" per question. Open even when `editable` is false: they stay
     * available after a lock.
     */
    discussion: QuestionDiscussion | null;
}

/**
 * What the question node views need beyond their own node. They render inside EditorContent,
 * so a context above it reaches them.
 */
export const ExamEditorContext = createContext<ExamEditorContextValue>({ examId: null, sittings: [], editable: false, discussion: null });

export const useExamEditor = () => useContext(ExamEditorContext);
