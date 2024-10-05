'use client'

import 'katex/dist/katex.min.css'
import { useEditor, EditorContent } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { ListItem } from "@tiptap/extension-list-item";
import { Mathematics } from '@tiptap-pro/extension-mathematics'
import {
    Bold,
    Italic,
    Strikethrough,
    Code as CodeIcon,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    Undo2,
    Redo2,
    SquareFunction,
    Info
} from "lucide-react";
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/ui/Dialog'
import { Text, Code } from '@/components/ui/Text'
import {useState} from "react";

/**
 * Dialog explaining how mathematical functions can be inserted
 */
const InfoDialog = ({isOpen, setIsOpen}) => {
    return (
        <Dialog isOpen={isOpen} onClose={setIsOpen}>
            <DialogTitle>
                Text Editor
            </DialogTitle>
            <DialogBody>
                <Text>The editor allows you to write and display mathematical formulas using LaTeX syntax.<br/>
                    Wrap your math expressions in <Code>$...$</Code> for inline formulas or <Code>$$...$$</Code> for
                    block formulas.<br/>
                    <br/>
                    For an overview of the supported functions, refer to the
                    <a href="https://katex.org/docs/supported" target="_blank"> documentation of KaTeX</a>,
                    the underlying LaTeX interpreter.
                </Text>
            </DialogBody>
            <DialogActions>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="primary-button">
                    Close
                </button>
            </DialogActions>
        </Dialog>
    )
}

const Toolbar = ({editor}) => {
    let [isInfoOpen, setIsInfoOpen] = useState(false);

    if (!editor) {
        return null
    }

    return (
        <div className="tiptap flex justify-between border border-gray-900/10 rounded-t-md p-2 items-center">
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
                    <Bold className="icon"/>
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
                    <Italic className="icon"/>
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
                    <Strikethrough className="icon"/>
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
                    <CodeIcon className="icon"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({level: 1}).run()}
                    className={`${editor.isActive('heading', {level: 1}) ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <Heading1 className="icon"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({level: 2}).run()}
                    className={`${editor.isActive('heading', {level: 2}) ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <Heading2 className="icon"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`${editor.isActive('bulletList') ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <List className="icon"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={`${editor.isActive('orderedList') ? 'isActive' : 'hover:bg-gray-100'}`}
                >
                    <ListOrdered className="icon"/>
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
                    <Undo2 className="icon"/>
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
                    <Redo2 className="icon"/>
                </button>
                <button
                    // Clicking inserts a math block
                    onClick={() => {
                        // Insert two dollar signs at the current cursor position
                        editor.chain().focus().insertContent('$$').run();

                        // Move the cursor between the dollar signs
                        const {tr} = editor.state;
                        const position = tr.selection.from - 1; // One character back (to move between the dollar signs)
                        const newSelection = TextSelection.create(tr.doc, position);

                        // Dispatch the transaction with the new cursor position
                        editor.view.dispatch(tr.setSelection(newSelection));
                    }}
                    className="p-1 mx-2 clickable"
                >
                    <SquareFunction className="icon"/>
                </button>
            </div>
            <div>
                <button className="clickable" onClick={() => setIsInfoOpen(true)}>
                    <Info className="icon"/>
                </button>
                <InfoDialog isOpen={isInfoOpen} setIsOpen={setIsInfoOpen} />
            </div>
        </div>
    )
}

/**
 * TipTap Editor which can be used to insert rich text and mathematics:
 * - https://tiptap.dev/docs/editor/getting-started/overview
 * - https://tiptap.dev/docs/editor/extensions/functionality/mathematics
 */
const Editor = () => {
    // Create the editor instance
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {},
                orderedList: {},
                code: {},
            }),
            TextStyle.configure({types: [ListItem.name]}),
            Mathematics,
        ],
        autofocus: true,
        editorProps: {
            attributes: {
                class: 'tiptap overflow-auto mx-auto h-32 border-l border-r border-b border-gray-900/10 rounded-b-md p-3 focus:outline-none',
            },
            // Strip styling from pasted content
            handlePaste(view, event, slice) {
                event.preventDefault()
                const text = event.clipboardData.getData('text/plain')
                view.dispatch(view.state.tr.insertText(text)) // Insert plain text as a new paragraph in the editor
                return true
            }
        },
    })

    return (
        <div className="editor-container max-w-3xl mx-auto p-8">
            <Toolbar editor={editor}/>
            <EditorContent
                editor={editor}
            />
        </div>
    )
}

export default Editor;
