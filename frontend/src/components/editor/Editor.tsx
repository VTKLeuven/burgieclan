'use client'

import {useEditor, EditorContent, useCurrentEditor, EditorProvider} from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'
import {StarterKit} from "@tiptap/starter-kit";
import {Color} from "@tiptap/extension-color";
import {TextStyle} from "@tiptap/extension-text-style";
import {ListItem} from "@tiptap/extension-list-item";
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
    Undo2
} from "lucide-react";
import {useState} from "react";

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null
    }

    return (
        <div className="tiptap flex border border-gray-900/10 rounded-t-md p-2 divide-x items-center">
            <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                disabled={
                    !editor.can()
                        .chain()
                        .focus()
                        .toggleBold()
                        .run()
                }
                className={`${editor.isActive('bold') ? 'is-active' : ''} px-3`}
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
                className={`${editor.isActive('italic') ? 'is-active' : ''} px-3`}
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
                className={`${editor.isActive('strike') ? 'is-active' : ''} px-3`}
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
                className={`${editor.isActive('code') ? 'is-active' : ''} px-3`}
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
            {/*    className={editor.isActive('paragraph') ? 'is-active' : ''}*/}
            {/*>*/}
            {/*    Paragraph*/}
            {/*</button>*/}
            <button
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} px-3`}
            >
                <Heading1 className="w-5 h-5 text-gray-900"/>
            </button>
            <button
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} px-3`}
            >
                <Heading2 className="w-5 h-5 text-gray-900"/>
            </button>
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}*/}
            {/*    className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}*/}
            {/*>*/}
            {/*    <Heading3 className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}*/}
            {/*    className={editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}*/}
            {/*>*/}
            {/*    <Heading4 className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleHeading({ level: 5 }).run()}*/}
            {/*    className={editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}*/}
            {/*>*/}
            {/*    <Heading5 className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleHeading({ level: 6 }).run()}*/}
            {/*    className={editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}*/}
            {/*>*/}
            {/*    <Heading6 className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={`${editor.isActive('bulletList') ? 'is-active' : ''} px-3`}
            >
                <List className="w-5 h-5 text-gray-900"/>
            </button>
            <button
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={`${editor.isActive('orderedList') ? 'is-active' : ''} px-3`}
            >
                <ListOrdered className="w-5 h-5 text-gray-900"/>
            </button>
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}*/}
            {/*    className={editor.isActive('codeBlock') ? 'is-active' : ''}*/}
            {/*>*/}
            {/*    <Code className="w-5 h-5 text-gray-900"/>*/}
            {/*</button>*/}
            {/*<button*/}
            {/*    onClick={() => editor?.chain().focus().toggleBlockquote().run()}*/}
            {/*    className={editor.isActive('blockquote') ? 'is-active' : ''}*/}
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
                className="px-3"
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
                className="pl-3"
            >
                <Redo2 className="w-5 h-5 text-gray-900"/>
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
        ],
        autofocus: true,
        editorProps: {
            attributes: {
                class: 'mx-auto h-32 border-l border-r border-b border-gray-900/10 rounded-b-md p-2',
            },
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
