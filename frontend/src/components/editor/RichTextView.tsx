'use client'

import { Mathematics } from '@tiptap/extension-mathematics';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import 'katex/dist/katex.min.css';

interface RichTextViewProps {
    html: string;
    className?: string;
}

/**
 * Shows HTML written with the Editor (components/editor/Editor.tsx) through a read-only editor
 * with the same schema, instead of dangerouslySetInnerHTML: formulas are drawn with KaTeX, and
 * only nodes, marks and attributes the editor knows reach the page, whatever was stored. The
 * backend sanitizes this HTML too (DocumentCommentSanitizer); this does not replace that.
 */
export default function RichTextView({ html, className = '' }: RichTextViewProps) {
    const editor = useEditor({
        extensions: [StarterKit, Mathematics],
        content: html,
        editable: false,
        immediatelyRender: false, // Prevents hydration errors in Next.js
        editorProps: {
            attributes: { class: `tiptap ${className}` },
        },
    }, [html, className]);

    return <EditorContent editor={editor} />;
}
