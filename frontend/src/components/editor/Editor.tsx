'use client'

import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog';
import { Code, Text } from '@/components/ui/Text';
import { Mathematics } from '@tiptap/extension-mathematics';
import { TextSelection } from '@tiptap/pm/state';
import { EditorContent, useEditor, type Editor as TipTapEditor } from '@tiptap/react';
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
    SquareFunction,
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

const Toolbar = ({ editor }: { editor: TipTapEditor|null }) => {
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    if (!editor) {
        return null
    }

    return (
        <div className="tiptap flex justify-between p-2 items-center border-b border-gray-900/10">
            <div>
                <button
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleBold()
                            .run()
                    }
                    className={`${editor.isActive('bold') ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <Bold className="icon" />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleItalic()
                            .run()
                    }
                    className={`${editor.isActive('italic') ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <Italic className="icon" />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleStrike()
                            .run()
                    }
                    className={`${editor.isActive('strike') ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <Strikethrough className="icon" />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleCode().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleCode()
                            .run()
                    }
                    className={`${editor.isActive('code') ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <CodeIcon className="icon" />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`${editor.isActive('heading', { level: 1 }) ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <Heading1 className="icon" />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`${editor.isActive('heading', { level: 2 }) ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <Heading2 className="icon" />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`${editor.isActive('bulletList') ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <List className="icon" />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={`${editor.isActive('orderedList') ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <ListOrdered className="icon" />
                </button>
                <button
                    onClick={() => editor?.chain().focus().undo().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .undo()
                            .run()
                    }
                    className="p-1 mx-2 clickable"
                >
                    <Undo2 className="icon" />
                </button>
                <button
                    onClick={() => editor?.chain().focus().redo().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .redo()
                            .run()
                    }
                    className="p-1 mx-2 clickable"
                >
                    <Redo2 className="icon" />
                </button>
                <button
                    // Clicking inserts a math block
                    onClick={() => {
                        // Insert two dollar signs at the current cursor position
                        editor.chain().focus().insertContent('$$').run();

                        // Move the cursor between the dollar signs
                        const { tr } = editor.state;
                        const position = tr.selection.from - 1; // One character back (to move between the dollar signs)
                        const newSelection = TextSelection.create(tr.doc, position);

                        // Dispatch the transaction with the new cursor position
                        editor.view.dispatch(tr.setSelection(newSelection));
                    }}
                    className="p-1 mx-2 clickable"
                >
                    <SquareFunction className="icon" />
                </button>
            </div>
            <div>
                <button className="clickable" onClick={() => setIsInfoOpen(true)}>
                    <Info className="icon" />
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
            Mathematics,
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
                view.dispatch(view.state.tr.insertText(text ?? '')); // Insert plain text as a new paragraph in the editor
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
        <div className={`editor-container border border-gray-900/10 rounded-md h-fit ${className}`}>
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    )
}

export default Editor;
