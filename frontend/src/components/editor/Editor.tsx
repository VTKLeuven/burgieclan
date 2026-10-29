'use client'

import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog';
import { Code, Text } from '@/components/ui/Text';
import { LatexMath } from '@/components/editor/math/latexMath';
import MathEditPopover from '@/components/editor/math/MathEditPopover';
import { EditorContent, useEditor, useEditorState, type Editor as TipTapEditor } from '@tiptap/react';
import { StarterKit } from "@tiptap/starter-kit";
import 'katex/dist/katex.min.css';
import {
    Bold,
    Code as CodeIcon,
    Heading1,
    Heading2,
    Info,
    Italic,
    List,
    ListOrdered,
    Redo2,
    Sigma,
    Strikethrough,
    Undo2
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';

interface InfoDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    parentDialogOpen?: boolean;
}

/**
 * Dialog explaining how mathematical functions can be inserted
 */
const InfoDialog = ({ isOpen, setIsOpen, parentDialogOpen }: InfoDialogProps) => {
    const { t } = useTranslation();

    // Close this dialog when parent dialog closes
    useEffect(() => {
        if (!parentDialogOpen) {
            setIsOpen(false);
        }
    }, [parentDialogOpen, setIsOpen]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
        >
            <DialogTitle>
                {t('editor.info_dialog.title')}
            </DialogTitle>
            <DialogBody>
                <Text>
                    {t('editor.info_dialog.description')}
                    <br />
                    {t('editor.info_dialog.inline')} <Code>$...$</Code> {t('editor.info_dialog.inline_end')}
                    {t('editor.info_dialog.block')} <Code>$$...$$</Code> {t('editor.info_dialog.block_end')}
                    <br /><br />
                    {t('editor.info_dialog.edit')}
                    <br /><br />
                    {t('editor.info_dialog.katex_overview')}
                    <a href="https://katex.org/docs/supported" target="_blank">{t('editor.info_dialog.katex_doc')}</a>,
                    {t('editor.info_dialog.katex_end')}
                </Text>
            </DialogBody>
            <DialogActions>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="primary-button">
                    {t('dialog.close')}
                </button>
            </DialogActions>
        </Dialog>
    )
}

/**
 * Formatting buttons for a TipTap editor. Exported so the live editor (components/collab) shares
 * it; undo and redo work there too, because the Collaboration extension provides both commands.
 */
export const Toolbar = ({ editor }: { editor: TipTapEditor|null }) => {
    const { t } = useTranslation();
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    useEditorState({
        editor,
        selector: ({ transactionNumber }) => transactionNumber,
    });

    if (!editor) {
        return null
    }

    return (
        <div className="tiptap flex justify-between p-2 items-center border-b border-vtk-ink/10">
            <div>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleBold()
                            .run()
                    }
                    title={t('editor.toolbar.bold')}
                    aria-label={t('editor.toolbar.bold')}
                    className={`${editor.isActive('bold') ? 'isActive' : 'hover:bg-vtk-paper-2'}`}
                >
                    <Bold className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleItalic()
                            .run()
                    }
                    title={t('editor.toolbar.italic')}
                    aria-label={t('editor.toolbar.italic')}
                    className={`${editor.isActive('italic') ? 'isActive' : 'hover:bg-vtk-paper-2'}`}
                >
                    <Italic className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleStrike()
                            .run()
                    }
                    title={t('editor.toolbar.strike')}
                    aria-label={t('editor.toolbar.strike')}
                    className={`${editor.isActive('strike') ? 'isActive' : 'hover:bg-vtk-paper-2'}`}
                >
                    <Strikethrough className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleCode().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleCode()
                            .run()
                    }
                    title={t('editor.toolbar.code')}
                    aria-label={t('editor.toolbar.code')}
                    className={`${editor.isActive('code') ? 'isActive' : 'hover:bg-vtk-paper-2'}`}
                >
                    <CodeIcon className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    title={t('editor.toolbar.heading1')}
                    aria-label={t('editor.toolbar.heading1')}
                    className={`${editor.isActive('heading', { level: 1 }) ? 'isActive' : 'hover:bg-vtk-paper-2'}`}
                >
                    <Heading1 className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    title={t('editor.toolbar.heading2')}
                    aria-label={t('editor.toolbar.heading2')}
                    className={`${editor.isActive('heading', { level: 2 }) ? 'isActive' : 'hover:bg-vtk-paper-2'}`}
                >
                    <Heading2 className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    title={t('editor.toolbar.bullet_list')}
                    aria-label={t('editor.toolbar.bullet_list')}
                    className={`${editor.isActive('bulletList') ? 'isActive' : 'hover:bg-vtk-paper-2'}`}
                >
                    <List className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    title={t('editor.toolbar.ordered_list')}
                    aria-label={t('editor.toolbar.ordered_list')}
                    className={`${editor.isActive('orderedList') ? 'isActive' : 'hover:bg-vtk-paper-2'}`}
                >
                    <ListOrdered className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().undo().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .undo()
                            .run()
                    }
                    title={t('editor.toolbar.undo')}
                    aria-label={t('editor.toolbar.undo')}
                    className="p-1 mx-2 clickable"
                >
                    <Undo2 className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => editor?.chain().focus().redo().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .redo()
                            .run()
                    }
                    title={t('editor.toolbar.redo')}
                    aria-label={t('editor.toolbar.redo')}
                    className="p-1 mx-2 clickable"
                >
                    <Redo2 className="icon" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    // Opens the formula editor (MathEditPopover) for a new formula at the cursor.
                    onClick={() => editor.commands.openMathEditor()}
                    className="p-1 mx-2 clickable"
                    title={t('editor.math.insert')}
                    aria-label={t('editor.math.insert')}
                >
                    <Sigma className="icon" aria-hidden="true" />
                </button>
                <MathEditPopover editor={editor} />
            </div>
            <div>
                <button
                    type="button"
                    className="clickable"
                    onClick={() => setIsInfoOpen(true)}
                    title={t('editor.info_button')}
                    aria-label={t('editor.info_button')}
                >
                    <Info className="icon" aria-hidden="true" />
                </button>
                <InfoDialog isOpen={isInfoOpen} setIsOpen={setIsInfoOpen} />
            </div>
        </div>
    )
}

export interface EditorProps {
    className?: string;
    onEditorReady?: (editor: TipTapEditor) => void;
}

/**
 * TipTap Editor which can be used to insert rich text and mathematics:
 * - https://tiptap.dev/docs/editor/getting-started/overview
 * - https://tiptap.dev/docs/editor/extensions/functionality/mathematics
 */
const Editor = ({ className = '', onEditorReady }: EditorProps) => {    // Create the editor instance
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {},
                orderedList: {},
                code: {},
            }),
            // TextStyle.configure({types: [ListItem.name]}), // TODO check if this does anything
            LatexMath,
        ],
        autofocus: true,
        immediatelyRender: false, // Prevents hydration errors in Next.js
        editorProps: {
            attributes: {
                class: 'tiptap overflow-auto mx-auto h-32 p-3 focus:outline-hidden',
            },
            // Strip styling from pasted content
            handlePaste(view, event) {
                event.preventDefault();
                const text = event.clipboardData?.getData('text/plain');
                // Insert plain text as a new paragraph in the editor. Marked as a paste, so the
                // paste rules still run and turn $…$ in the pasted text into formulas (LatexMath).
                view.dispatch(view.state.tr.insertText(text ?? '').setMeta('uiEvent', 'paste'));
                return true;
            }
        },
    })

    // Notify parent when editor is ready
    useEffect(() => {
        if (editor && onEditorReady) {
            onEditorReady(editor);
        }
    }, [editor, onEditorReady]);

    return (
        <div className={`editor-container border border-vtk-ink/10 rounded-md h-fit ${className}`}>
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    )
}

export default Editor;
