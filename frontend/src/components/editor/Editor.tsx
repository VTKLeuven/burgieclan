'use client'

import 'katex/dist/katex.min.css'
import {useEditor, EditorContent, useCurrentEditor, EditorProvider} from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'
import {StarterKit} from "@tiptap/starter-kit";
import {Color} from "@tiptap/extension-color";
import {TextStyle} from "@tiptap/extension-text-style";
import {ListItem} from "@tiptap/extension-list-item";
import { Mathematics } from '@tiptap-pro/extension-mathematics'
import {
    Bold,
    Code,
    CornerDownLeft,
    Heading1,
    Heading2,
    Heading3, Heading4, Heading5, Heading6,
    Italic, List, ListOrdered,
    Minus,
    Redo2,
    Strikethrough, TextQuote,
    Undo2,
    SquareFunction
} from "lucide-react";
import {useState} from "react";

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null
    }

    return (
        <div className="tiptap flex border border-gray-900/10 rounded-t-md p-2 items-center">
            <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                disabled={
                    !editor.can()
                        .chain()
                        .focus()
                        .toggleBold()
                        .run()
                }
                className={`${editor.isActive('bold') ? 'isActive' : ''} p-1 mx-2 rounded-md`}
            >
                <Bold className="w-5 h-5 text-gray-900"/>
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
                className={`${editor.isActive('italic') ? 'isActive' : ''} p-1 mx-2 rounded-md`}
            >
                <Italic className="w-5 h-5 text-gray-900"/>
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
                className={`${editor.isActive('strike') ? 'isActive' : ''} p-1 mx-2 rounded-md`}
            >
                <Strikethrough className="w-5 h-5 text-gray-900"/>
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
                className={`${editor.isActive('code') ? 'isActive' : ''} p-1 mx-2 rounded-md`}
            >
                <Code className="w-5 h-5 text-gray-900"/>
            </button>
            {/*<button onClick={() => editor?.chain().focus().unsetAllMarks().run()}>*/}
            {/*    Clear marks*/}
            {/*</button>*/}
            {/*<button onClick={() => editor?.chain().focus().clearNodes().run()}>*/}
            {/*    Clear nodes*/}
            {/*</button>*/}
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().setParagraph().run()}*/}
            {/*    className={editor.isActive('paragraph') ? 'isActive' : ''}*/}
            {/*>*/}
            {/*    Paragraph*/}
            {/*</button>*/}
            <button
                onClick={() => editor?.chain().focus().toggleHeading({level: 1}).run()}
                className={`${editor.isActive('heading', {level: 1}) ? 'isActive' : ''} p-1 mx-2 rounded-md`}
            >
                <Heading1 className="w-5 h-5 text-gray-900"/>
            </button>
            <button
                onClick={() => editor?.chain().focus().toggleHeading({level: 2}).run()}
                className={`${editor.isActive('heading', {level: 2}) ? 'isActive' : ''} p-1 mx-2 rounded-md`}
            >
                <Heading2 className="w-5 h-5 text-gray-900"/>
            </button>
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}*/}
            {/*    className={editor.isActive('heading', { level: 3 }) ? 'isActive' : ''}*/}
            {/*>*/}
            {/*    <Heading3 className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}*/}
            {/*    className={editor.isActive('heading', { level: 4 }) ? 'isActive' : ''}*/}
            {/*>*/}
            {/*    <Heading4 className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleHeading({ level: 5 }).run()}*/}
            {/*    className={editor.isActive('heading', { level: 5 }) ? 'isActive' : ''}*/}
            {/*>*/}
            {/*    <Heading5 className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleHeading({ level: 6 }).run()}*/}
            {/*    className={editor.isActive('heading', { level: 6 }) ? 'isActive' : ''}*/}
            {/*>*/}
            {/*    <Heading6 className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={`${editor.isActive('bulletList') ? 'isActive' : ''} p-1 mx-2 rounded-md`}
            >
                <List className="w-5 h-5 text-gray-900"/>
            </button>
            <button
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={`${editor.isActive('orderedList') ? 'isActive' : ''} p-1 mx-2 rounded-md`}
            >
                <ListOrdered className="w-5 h-5 text-gray-900"/>
            </button>
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}*/}
            {/*    className={editor.isActive('codeBlock') ? 'isActive' : ''}*/}
            {/*>*/}
            {/*    <Code className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleBlockquote().run()}*/}
            {/*    className={editor.isActive('blockquote') ? 'isActive' : ''}*/}
            {/*>*/}
            {/*    <TextQuote className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button onClick={() => editor?.chain().focus().setHorizontalRule().run()}>*/}
            {/*    <Minus className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button onClick={() => editor?.chain().focus().setHardBreak().run()}>*/}
            {/*    <CornerDownLeft className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
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
                <Undo2 className="w-5 h-5 text-gray-900"/>
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
                <Redo2 className="w-5 h-5 text-gray-900"/>
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
                <SquareFunction className="w-5 h-5 text-gray-900"/>
            </button>
        </div>
    )
}

// const extensions = [
//     TextStyle.configure({HTMLAttributes: undefined, types: [ListItem.name] }),
//     StarterKit.configure({
//         bulletList: {
//             keepMarks: true,
//             keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
//         },
//         orderedList: {
//             keepMarks: true,
//             keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
//         },
//     }),
// ]

const Editor = () => {
    // Create the editor instance
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                },
                orderedList: {
                },
                code: {
                },
            }),
            Color.configure({ types: [TextStyle.name, ListItem.name] }),
            TextStyle.configure({ types: [ListItem.name] }),
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
                view.dispatch(view.state.tr.insertText(text)) // insert plain text as a new paragraph in the editor
                return true
            }
        },
    })

    return (
        <div className="editor-container max-w-3xl mx-auto p-8">
            <MenuBar editor={editor}/>
            <EditorContent
                editor={editor}
            />
        </div>
    )
}

export default Editor;
