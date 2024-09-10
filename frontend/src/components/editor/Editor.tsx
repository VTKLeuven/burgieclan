'use client'

import { useEffect, useState } from 'react'
import { EditorContent } from '@tiptap/react'
import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'

const TextEditor = () => {
    const [editor, setEditor] = useState<Editor | null>(null)

    useEffect(() => {
        const editorInstance = new Editor({
            extensions: [
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
            injectCSS: false,
            editorProps: {
                attributes: {
                    class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',
                },
            },
        })

        setEditor(editorInstance)

        // Cleanup the editor instance when the component is unmounted
        return () => {
            editorInstance.destroy()
        }
    }, [])

    if (!editor) {
        return null // Render nothing until the editor is initialized
    }

    return <EditorContent editor={editor} />
}

export default TextEditor
