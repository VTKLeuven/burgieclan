'use client'

import { mathEditLatex, mathEditTarget, saveMath, type MathEditTarget } from '@/components/editor/math/latexMath';
import { useEditorState, type Editor } from '@tiptap/react';
import katex from 'katex';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const WIDTH = 360;
const MARGIN = 8;

/** Where to show the popover: just below the formula, or the cursor for a new one. */
function anchorOf(editor: Editor, target: MathEditTarget): { top: number; left: number } | null {
    try {
        const element = target.mode === 'edit' ? editor.view.nodeDOM(target.pos) : null;
        const rect = element instanceof HTMLElement
            ? element.getBoundingClientRect()
            : (() => {
                const coords = editor.view.coordsAtPos(target.pos);
                return { left: coords.left, bottom: coords.bottom };
            })();
        return {
            top: rect.bottom + 6,
            left: Math.min(Math.max(rect.left, MARGIN), window.innerWidth - WIDTH - MARGIN),
        };
    } catch {
        return null;
    }
}

function Popover({ editor, target }: { editor: Editor; target: MathEditTarget }) {
    const { t } = useTranslation();
    const [latex, setLatex] = useState(() => mathEditLatex(editor, target));
    const [anchor, setAnchor] = useState(() => anchorOf(editor, target));
    const box = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const display = target.mode === 'edit' && editor.state.doc.nodeAt(target.pos)?.type.name === 'blockMath';

    const preview = useMemo(() => {
        if (latex.trim() === '') {
            return null;
        }
        return katex.renderToString(latex, { throwOnError: false, displayMode: display });
    }, [latex, display]);

    useEffect(() => {
        input.current?.focus();
        input.current?.select();
    }, []);

    // Follow the formula when the page scrolls or other people's edits move it.
    useLayoutEffect(() => {
        const follow = () => setAnchor(anchorOf(editor, target));
        follow();
        window.addEventListener('scroll', follow, true);
        window.addEventListener('resize', follow);
        return () => {
            window.removeEventListener('scroll', follow, true);
            window.removeEventListener('resize', follow);
        };
    }, [editor, target]);

    // A click anywhere else closes it without saving.
    useEffect(() => {
        const close = (event: MouseEvent) => {
            if (box.current && !box.current.contains(event.target as Node)) {
                editor.commands.closeMathEditor();
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [editor]);

    if (!anchor) {
        return null;
    }

    // Focus goes back to the editor at once: Tiptap's focus() waits a frame, and whatever you
    // type straight after Enter would land nowhere while this field is already gone.
    const cancel = () => {
        editor.view.focus();
        editor.chain().focus().closeMathEditor().run();
    };
    const save = () => {
        editor.view.focus();
        saveMath(editor, target, latex);
    };

    return (
        <div
            ref={box}
            role="dialog"
            aria-label={t(target.mode === 'edit' ? 'editor.math.edit' : 'editor.math.insert')}
            className="fixed z-50 rounded-lg border border-vtk-line bg-vtk-surface p-3 shadow-lg"
            style={{ top: anchor.top, left: anchor.left, width: WIDTH }}
        >
            <label className="block text-xs font-medium text-vtk-muted" htmlFor="math-edit-latex">
                {t('editor.math.label')}
            </label>
            <input
                id="math-edit-latex"
                ref={input}
                value={latex}
                onChange={(event) => setLatex(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        save();
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        cancel();
                    }
                }}
                spellCheck={false}
                autoComplete="off"
                placeholder="\frac{a}{b}"
                className="mt-1 w-full rounded-md border border-vtk-line bg-vtk-paper px-2 py-1.5 font-mono text-sm text-vtk-ink focus:outline-2 focus:outline-vtk-yellow"
            />
            <div
                className="mt-2 min-h-8 overflow-x-auto rounded-md bg-vtk-paper-2 px-2 py-1.5 text-vtk-ink"
                aria-live="polite"
            >
                {preview
                    ? <span dangerouslySetInnerHTML={{ __html: preview }} />
                    : <span className="text-sm text-vtk-muted">{t('editor.math.preview_empty')}</span>}
            </div>
            <p className="m-0 mt-2 text-xs text-vtk-muted">{t('editor.math.keys')}</p>
            <div className="mt-2 flex justify-end gap-2">
                <button type="button" className="vtk-button vtk-button-sm vtk-button-ghost" onClick={cancel}>
                    {t('editor.math.cancel')}
                </button>
                <button type="button" className="vtk-button vtk-button-sm vtk-button-primary" onClick={save}>
                    {t('editor.math.save')}
                </button>
            </div>
        </div>
    );
}

/**
 * The little editor that opens when you click a formula, or press Σ: the LaTeX, a live preview,
 * Enter to save, Escape to cancel. Saving it empty removes the formula.
 */
export default function MathEditPopover({ editor }: { editor: Editor }) {
    const target = useEditorState({ editor, selector: ({ editor: current }) => mathEditTarget(current) });

    if (!target) {
        return null;
    }
    // A new key per opening, so switching to another formula starts from its own LaTeX, while
    // the position moving under it (other people typing) keeps what you typed.
    return <Popover key={target.id} editor={editor} target={target} />;
}
