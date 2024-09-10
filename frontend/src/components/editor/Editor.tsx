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

const MenuBar = () => {
    const { editor } = useCurrentEditor()

    if (!editor) {
        return null
    }

    return (
        <div className="control-group">
            <div className="button-group">
                <button
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    disabled={
                        !editor.can()
                            .chain()
                            .focus()
                            .toggleBold()
                            .run()
                    }
                    className={editor.isActive('bold') ? 'is-active' : ''}
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
                    className={editor.isActive('italic') ? 'is-active' : ''}
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
                    className={editor.isActive('strike') ? 'is-active' : ''}
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
                    className={editor.isActive('code') ? 'is-active' : ''}
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
                    className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                >
                    <Heading1 className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                >
                    <Heading2 className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                >
                    <Heading3 className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}
                    className={editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}
                >
                    <Heading4 className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 5 }).run()}
                    className={editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}
                >
                    <Heading5 className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 6 }).run()}
                    className={editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}
                >
                    <Heading6 className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'is-active' : ''}
                >
                    <List className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'is-active' : ''}
                >
                    <ListOrdered className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    className={editor.isActive('codeBlock') ? 'is-active' : ''}
                >
                    <ListOrdered className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    className={editor.isActive('blockquote') ? 'is-active' : ''}
                >
                    <TextQuote className="w-5 h-5 text-gray-900"/>
                </button>
                <button onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
                    <Minus className="w-5 h-5 text-gray-900"/>
                </button>
                <button onClick={() => editor?.chain().focus().setHardBreak().run()}>
                    <CornerDownLeft className="w-5 h-5 text-gray-900"/>
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
                >
                    <Redo2 className="w-5 h-5 text-gray-900"/>
                </button>
                <button
                    onClick={() => editor?.chain().focus().setColor('#958DF1').run()}
                    className={editor.isActive('textStyle', { color: '#958DF1' }) ? 'is-active' : ''}
                >
                    Purple
                </button>
            </div>
        </div>
    )
}

const extensions = [
    Color.configure({ types: [TextStyle.name, ListItem.name] }),
    TextStyle.configure({HTMLAttributes: undefined, types: [ListItem.name] }),
    StarterKit.configure({
        bulletList: {
            keepMarks: true,
            keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
        },
        orderedList: {
            keepMarks: true,
            keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
        },
    }),
]

const content = "bla";

const Editor = () => {
    const editor = useEditor({
        // bind Tiptap to `.element`
        element: document.querySelector('.element'),
        extensions: [
            StarterKit,
            Document,
            Paragraph,
            Text,
            Heading.configure({
                levels: [1, 2, 3],
            }),
        ],
        content: '<p>Example Text</p>',
        autofocus: true,
        editable: true,
        // disable the loading of the default CSS
        injectCSS: false,
    })

    return (
        <EditorProvider slotBefore={<MenuBar />} extensions={extensions} content={content}>
            <EditorContent editor={editor} />
        </EditorProvider>
    )
}

export default Editor
