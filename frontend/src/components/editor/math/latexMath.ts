import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { Extension, InputRule, PasteRule, type Editor } from '@tiptap/react';

/*
 * Formulas written the way LaTeX users already write them: `$1+1=2$` inside a sentence, and
 * `$$\int_0^1 x\,dx$$` on a line of its own for a formula set apart. Tiptap's own extension
 * expects `$$…$$` and `$$$…$$$` instead; its nodes (inlineMath, blockMath, both just storing the
 * LaTeX) and KaTeX rendering are kept, only the way you type and paste them is replaced here.
 *
 * Like Pandoc, a `$…$` formula may not start or end with a space, so prices such as
 * "tussen $5 en $10" stay text. A formula can be changed later by clicking it (MathEditPopover).
 */

/** `$…$`: no `$` or line break inside, no space just inside either dollar. */
const INLINE = String.raw`\$([^\s$](?:[^$\n]*[^\s$\\])?)\$`;
/** `$$…$$`: anything but `$` inside. */
const DISPLAY = String.raw`\$\$([^$]+?)\$\$`;

/** What came before a match may not be a `$` (part of `$$`) or a backslash (an escaped `\$`). */
function startsCleanly(text: string, index: number): boolean {
    return index === 0 || (text[index - 1] !== '$' && text[index - 1] !== '\\');
}

/**
 * The formula you just closed with a `$`, if any. Only a match that ends exactly where you are
 * typing counts, so nothing earlier in the paragraph is touched.
 */
function findTypedInlineMath(text: string) {
    for (const pattern of [new RegExp(DISPLAY + '$'), new RegExp(INLINE + '$')]) {
        const match = pattern.exec(text);
        if (match && startsCleanly(text, match.index) && match[1].trim() !== '') {
            return { index: match.index, text: match[0], data: { latex: match[1].trim() } };
        }
    }
    return null;
}

/** Every formula in pasted text, `$$…$$` before `$…$` so the one never splits the other. */
function findPastedMath(text: string) {
    const found: { index: number; text: string; data: { latex: string; display: boolean } }[] = [];
    const taken = (from: number, to: number) => found.some((match) => from < match.index + match.text.length && to > match.index);

    for (const [source, display] of [[DISPLAY, true], [INLINE, false]] as const) {
        const pattern = new RegExp(source, 'g');
        for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
            const end = match.index + match[0].length;
            if (startsCleanly(text, match.index) && text[end] !== '$' && !taken(match.index, end) && match[1].trim() !== '') {
                found.push({ index: match.index, text: match[0], data: { latex: match[1].trim(), display } });
            }
        }
    }

    return found.sort((a, b) => a.index - b.index);
}

/**
 * Replaces a whole paragraph by a block formula when the formula is all it holds. When typed,
 * the cursor moves on to an empty line below: left on the formula, the next key would overwrite it.
 */
function replaceWithBlock(state: EditorState, from: number, to: number, block: ProseMirrorNode, typed: boolean): boolean {
    const $from = state.doc.resolve(from);
    const wholeTextblock = $from.parent.isTextblock && from === $from.start() && to === $from.end();
    if (!wholeTextblock || !$from.node(-1).canReplaceWith($from.index(-1), $from.indexAfter(-1), block.type)) {
        return false;
    }

    const { tr } = state;
    const start = $from.before();
    tr.replaceWith(start, $from.after(), block);
    const after = start + block.nodeSize;
    const paragraph = state.schema.nodes.paragraph;
    if (typed && paragraph && tr.doc.resolve(after).parent.canReplaceWith(tr.doc.resolve(after).index(), tr.doc.resolve(after).index(), paragraph)) {
        tr.insert(after, paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, after + 1));
    }
    return true;
}

const LatexInlineMath = InlineMath.extend({
    addInputRules() {
        return [new InputRule({
            find: findTypedInlineMath,
            handler: ({ state, range, match }) => {
                const latex = (match.data as { latex?: string } | undefined)?.latex;
                if (!latex) {
                    return null;
                }
                // `$$…$$` alone on its line is a block formula; inside a sentence it stays inline.
                const blockMath = state.schema.nodes.blockMath;
                if (match[0].startsWith('$$') && blockMath && replaceWithBlock(state, range.from, range.to, blockMath.create({ latex }), true)) {
                    return;
                }
                state.tr.replaceWith(range.from, range.to, this.type.create({ latex }));
            },
        })];
    },

    addPasteRules() {
        return [new PasteRule({
            find: findPastedMath,
            handler: ({ state, range, match }) => {
                const { latex, display } = match.data as { latex: string; display: boolean };
                const blockMath = state.schema.nodes.blockMath;
                if (display && blockMath && replaceWithBlock(state, range.from, range.to, blockMath.create({ latex }), false)) {
                    return;
                }
                state.tr.replaceWith(range.from, range.to, this.type.create({ latex }));
            },
        })];
    },
});

/** Block formulas come from LatexInlineMath's rules; Tiptap's `$$$…$$$` rule is dropped. */
const LatexBlockMath = BlockMath.extend({
    addInputRules() {
        return [];
    },
});

export type MathEditTarget = {
    /** Changing the formula at `pos`, or writing a new one to put at `pos` once saved. */
    mode: 'edit' | 'insert';
    pos: number;
    /** Stays the same while `pos` moves, so the popover keeps what you typed. */
    id: number;
};

let nextId = 1;

export const mathEditKey = new PluginKey<MathEditTarget | null>('mathEdit');

function isMath(node: ProseMirrorNode | null | undefined): boolean {
    return node?.type.name === 'inlineMath' || node?.type.name === 'blockMath';
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        mathEdit: {
            /** Opens the formula editor for a new formula at the cursor (the Σ button). */
            openMathEditor: () => ReturnType;
            closeMathEditor: () => ReturnType;
        };
    }
}

/**
 * Which formula MathEditPopover is editing, if any. Kept in the editor state so the position
 * follows every change, your own and other people's, while the popover is open; it closes when
 * the formula is gone.
 */
const MathEditing = Extension.create({
    name: 'mathEdit',

    addCommands() {
        return {
            openMathEditor: () => ({ state, dispatch }) => {
                if (dispatch) {
                    dispatch(state.tr.setMeta(mathEditKey, { mode: 'insert', pos: state.selection.from, id: nextId++ }));
                }
                return true;
            },
            closeMathEditor: () => ({ state, dispatch }) => {
                if (dispatch) {
                    dispatch(state.tr.setMeta(mathEditKey, null));
                }
                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [new Plugin<MathEditTarget | null>({
            key: mathEditKey,
            state: {
                init: () => null,
                apply(tr, target) {
                    const meta = tr.getMeta(mathEditKey) as MathEditTarget | null | undefined;
                    if (meta !== undefined) {
                        return meta;
                    }
                    if (!target || !tr.docChanged) {
                        return target;
                    }
                    const mapped = tr.mapping.mapResult(target.pos, target.mode === 'edit' ? 1 : -1);
                    if (target.mode === 'edit' && (mapped.deleted || !isMath(tr.doc.nodeAt(mapped.pos)))) {
                        return null;
                    }
                    return { ...target, pos: mapped.pos };
                },
            },
            props: {
                handleClickOn(view, _pos, node, nodePos) {
                    if (!view.editable || !isMath(node)) {
                        return false;
                    }
                    view.dispatch(view.state.tr.setMeta(mathEditKey, { mode: 'edit', pos: nodePos, id: nextId++ }));
                    return true;
                },
            },
        })];
    },
});

/**
 * Formulas for every editor on the site: Tiptap's math nodes rendered with KaTeX, typed and
 * pasted as `$…$` and `$$…$$`, and editable by clicking (MathEditPopover in the toolbar).
 */
export const LatexMath = Extension.create({
    name: 'latexMath',

    addExtensions() {
        return [LatexBlockMath, LatexInlineMath, MathEditing];
    },
});

export function mathEditTarget(editor: Editor): MathEditTarget | null {
    return mathEditKey.getState(editor.state) ?? null;
}

/** The LaTeX of the formula being edited, or "" for a new one. */
export function mathEditLatex(editor: Editor, target: MathEditTarget): string {
    if (target.mode === 'insert') {
        return '';
    }
    const node = editor.state.doc.nodeAt(target.pos);
    return typeof node?.attrs.latex === 'string' ? node.attrs.latex : '';
}

/** Saves what was typed in the popover: changes, inserts or (when emptied) removes the formula. */
export function saveMath(editor: Editor, target: MathEditTarget, latex: string) {
    const value = latex.trim();
    const chain = editor.chain().focus();

    if (target.mode === 'insert') {
        if (value !== '') {
            chain.insertContentAt(target.pos, { type: 'inlineMath', attrs: { latex: value } });
        }
        chain.closeMathEditor().run();
        return;
    }

    const node = editor.state.doc.nodeAt(target.pos);
    if (!node || !isMath(node)) {
        chain.closeMathEditor().run();
        return;
    }
    chain.command(({ tr }) => {
        if (value === '') {
            tr.delete(target.pos, target.pos + node.nodeSize);
        } else {
            tr.setNodeMarkup(target.pos, undefined, { ...node.attrs, latex: value });
        }
        return true;
    });
    chain.closeMathEditor().run();
}
