'use client'

import { mathEditLatex, mathEditTarget, saveMath, type MathEditTarget } from '@/components/editor/math/latexMath';
import { useEditorState, type Editor } from '@tiptap/react';
import katex from 'katex';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const WIDTH = 380;
const MARGIN = 8;

/** WIDTH, or less on a screen too narrow for it. */
function popoverWidth(): number {
    return Math.min(WIDTH, window.innerWidth - 2 * MARGIN);
}

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
            left: Math.max(Math.min(rect.left, window.innerWidth - popoverWidth() - MARGIN), MARGIN),
        };
    } catch {
        return null;
    }
}

function Popover({ editor, target }: { editor: Editor; target: MathEditTarget }) {
    const { t } = useTranslation();
    const [latex, setLatex] = useState(() => mathEditLatex(editor, target));
    const [anchor, setAnchor] = useState(() => anchorOf(editor, target));
    const [isBlock, setIsBlock] = useState(() => {
        if (target.mode === 'edit') {
            return editor.state.doc.nodeAt(target.pos)?.type.name === 'blockMath';
        }
        try {
            return editor.state.doc.resolve(target.pos).parent.textContent.trim() === '';
        } catch {
            return false;
        }
    });
    const box = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);

    const preview = useMemo(() => {
        if (latex.trim() === '') {
            return null;
        }
        return katex.renderToString(latex, { throwOnError: false, displayMode: isBlock });
    }, [latex, isBlock]);

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
        saveMath(editor, target, latex, isBlock);
    };

    const handleLatexChange = (val: string) => {
        // Only dollars around something, so typing "$$x$$" one key at a time is not cut short at "$$".
        if (val.startsWith('$$') && val.endsWith('$$') && val.length > 4) {
            setIsBlock(true);
            setLatex(val.slice(2, -2).trim());
        } else if (val.startsWith('$') && !val.startsWith('$$') && val.endsWith('$') && val.length > 2) {
            setLatex(val.slice(1, -1).trim());
        } else {
            setLatex(val);
        }
    };

    return (
        <div
            ref={box}
            role="dialog"
            aria-label={t(target.mode === 'edit' ? 'editor.math.edit' : 'editor.math.insert')}
            className="fixed z-50 rounded-lg border border-vtk-line bg-vtk-surface p-3 shadow-lg"
            style={{ top: anchor.top, left: anchor.left, width: WIDTH, maxWidth: `calc(100vw - ${2 * MARGIN}px)` }}
        >
            <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-vtk-muted" htmlFor="math-edit-latex">
                    {t('editor.math.label')}
                </label>
                <div className="flex rounded-md bg-vtk-paper-2 p-0.5 text-xs">
                    <button
                        type="button"
                        onClick={() => setIsBlock(false)}
                        className={`rounded px-2 py-0.5 transition-colors ${!isBlock ? 'bg-vtk-paper font-semibold text-vtk-ink shadow-xs' : 'text-vtk-muted hover:text-vtk-ink'}`}
                    >
                        {t('editor.math.mode_inline')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsBlock(true)}
                        className={`rounded px-2 py-0.5 transition-colors ${isBlock ? 'bg-vtk-paper font-semibold text-vtk-ink shadow-xs' : 'text-vtk-muted hover:text-vtk-ink'}`}
                    >
                        {t('editor.math.mode_block')}
                    </button>
                </div>
            </div>
            <input
                id="math-edit-latex"
                ref={input}
                value={latex}
                onChange={(event) => handleLatexChange(event.target.value)}
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
                className="mt-2 w-full rounded-md border border-vtk-line bg-vtk-paper px-2 py-1.5 font-mono text-sm text-vtk-ink focus:outline-2 focus:outline-vtk-yellow"
            />
            <div
                className={`mt-2 min-h-8 overflow-x-auto rounded-md bg-vtk-paper-2 px-2 py-1.5 text-vtk-ink ${isBlock ? 'text-center' : ''}`}
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
