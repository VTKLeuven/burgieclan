import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import { Fragment, Slice, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { NodeSelection, Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Extension, InputRule, PasteRule, type Editor, type MappablePosition } from '@tiptap/react';

/*
 * Formulas written the way LaTeX users write them: `$1+1=2$` inside a sentence, and
 * `$$\int_0^1 x\,dx$$` for a formula set apart on its own line (display / block formula).
 * Tiptap's own extension expects `$$…$$` and `$$$…$$$` instead; its nodes (inlineMath, blockMath,
 * both storing the LaTeX) and KaTeX rendering are kept, while input, paste rules, and editing
 * are streamlined here.
 *
 * Typing:
 * - `$formula$`: becomes an inline formula inside the sentence.
 * - `$$formula$$`: becomes a display formula on its own line (blockMath), splitting the textblock
 *   if needed, with the cursor placed in a new paragraph below so writing can continue.
 * - `$$` on an empty line followed by Enter: creates a block formula and opens the formula editor.
 *
 * Pasting:
 * - Plain text with `$…$` and `$$…$$` (including multiline `$$\n…\n$$`) is converted into the
 *   matching inline and block math nodes across all editors.
 *
 * Editing:
 * - Clicking any formula opens MathEditPopover with a live KaTeX preview, switching between inline
 *   and whole-line (block) modes, Enter saves, Escape cancels.
 */

/** `$…$`: formula inside a sentence. Allows optional spaces inside, e.g. `$ x $` or `$1+1=2$`. */
const INLINE = String.raw`\$([^\s$](?:[^$\n]*?[^\s$\\])?)\$`;
const INLINE_SPACED = String.raw`\$\s*([^$\n]+?)\s*\$`;
/** `$$…$$`: block formula on its own line / display math. */
const DISPLAY = String.raw`\$\$([\s\S]+?)\$\$`;

/** What came before a match may not be a `$` (part of `$$`) or a backslash (an escaped `\$`). */
function startsCleanly(text: string, index: number): boolean {
    return index === 0 || (text[index - 1] !== '$' && text[index - 1] !== '\\');
}

/**
 * The formula you just closed with a `$`, if any. Only a match that ends exactly where you are
 * typing counts, so nothing earlier in the paragraph is touched.
 */
function findTypedInlineMath(text: string) {
    for (const pattern of [new RegExp(DISPLAY + '$'), new RegExp(INLINE + '$'), new RegExp(INLINE_SPACED + '$')]) {
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

    // The spaced form last, as when typing, so `$x$` is never read as part of a wider `$ … $`.
    for (const [source, display] of [[DISPLAY, true], [INLINE, false], [INLINE_SPACED, false]] as const) {
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
 * Whether a textblock holds anything but blank text between two offsets within it. Formulas and
 * other inline nodes count: they have no text, but a line holding one is not empty.
 */
function hasContent(textblock: ProseMirrorNode, from: number, to: number): boolean {
    if (textblock.textBetween(from, to).trim() !== '') {
        return true;
    }
    let found = false;
    textblock.nodesBetween(from, to, (node) => {
        found ||= !node.isText;
        return !found;
    });
    return found;
}

/**
 * Inserts a block formula node into the document.
 * - If the paragraph only holds the formula (and optional whitespace), the whole paragraph is replaced.
 * - If the formula is preceded or followed by anything else, text or another formula, the
 *   textblock is split so the block formula gets its own line between them.
 * - When typed, the cursor advances into a new paragraph right below the formula.
 */
function insertBlockFormula(
    tr: Transaction,
    state: EditorState,
    from: number,
    to: number,
    block: ProseMirrorNode,
    typed: boolean,
): boolean {
    const $from = state.doc.resolve(from);
    const depth = $from.depth;
    if (depth < 1) {
        return false;
    }
    const container = $from.node(depth - 1);
    const containerIndex = $from.index(depth - 1);
    if (!container.canReplaceWith(containerIndex, containerIndex + 1, block.type)) {
        return false;
    }

    const contentBefore = hasContent($from.parent, 0, $from.parentOffset);
    const contentAfter = hasContent($from.parent, state.doc.resolve(to).parentOffset, $from.parent.content.size);
    const paragraph = state.schema.nodes.paragraph;

    if (!contentBefore && !contentAfter) {
        const start = $from.before();
        const end = $from.after();
        tr.replaceWith(start, end, block);
        const after = start + block.nodeSize;
        if (typed && paragraph) {
            const $after = tr.doc.resolve(after);
            if ($after.parent.canReplaceWith($after.index(), $after.index(), paragraph)) {
                tr.insert(after, paragraph.create());
                const nextPos = after + 1;
                if (nextPos <= tr.doc.content.size && tr.doc.resolve(nextPos).parent.isTextblock) {
                    tr.setSelection(TextSelection.create(tr.doc, nextPos));
                }
            }
        }
        return true;
    }

    tr.delete(from, to);

    if (contentBefore && !contentAfter) {
        const $pos = tr.doc.resolve(from);
        const afterPos = $pos.after();
        tr.insert(afterPos, block);
        const pAfter = afterPos + block.nodeSize;
        if (typed && paragraph) {
            tr.insert(pAfter, paragraph.create());
            const nextPos = pAfter + 1;
            if (nextPos <= tr.doc.content.size && tr.doc.resolve(nextPos).parent.isTextblock) {
                tr.setSelection(TextSelection.create(tr.doc, nextPos));
            }
        }
        return true;
    }

    if (!contentBefore && contentAfter) {
        const $pos = tr.doc.resolve(from);
        const beforePos = $pos.before();
        tr.insert(beforePos, block);
        return true;
    }

    // Text both before and after: split the textblock around the block formula
    tr.split(from);
    tr.insert(from + 1, block);
    if (typed) {
        const after = from + 1 + block.nodeSize;
        const sel = TextSelection.findFrom(tr.doc.resolve(after), 1, true);
        if (sel) {
            tr.setSelection(sel);
        }
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
                const isDisplay = match[0].startsWith('$$');
                const blockMath = state.schema.nodes.blockMath;
                if (isDisplay && blockMath && insertBlockFormula(state.tr, state, range.from, range.to, blockMath.create({ latex }), true)) {
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
                if (display && blockMath && insertBlockFormula(state.tr, state, range.from, range.to, blockMath.create({ latex }), false)) {
                    return;
                }
                state.tr.replaceWith(range.from, range.to, this.type.create({ latex }));
            },
        })];
    },
});

/** Block formulas come from rules and shortcuts; Tiptap's `$$$…$$$` rule is dropped. */
const LatexBlockMath = BlockMath.extend({
    addInputRules() {
        return [];
    },

    addKeyboardShortcuts() {
        return {
            Enter: () => {
                const { editor } = this;
                const { state } = editor;
                const { $from, empty } = state.selection;
                const line = $from.parent;
                // "$$" alone on a line, then Enter: the formula editor opens there for a block formula.
                // Nothing goes into the document before it is saved, so cancelling leaves an empty line
                // rather than an empty formula nobody can see.
                if (!empty || !line.isTextblock || line.childCount !== 1 || !line.firstChild?.isText || line.textContent.trim() !== '$$') {
                    return false;
                }
                const start = $from.start();
                editor.view.dispatch(state.tr.delete(start, $from.end()));
                return editor.commands.openMathEditor({ pos: start, mode: 'insert' });
            },
        };
    },
});

export type MathEditTarget = {
    /** Changing the formula at `pos`, or writing a new one to put at `pos` once saved. */
    mode: 'edit' | 'insert';
    pos: number;
    /**
     * Where `pos` is kept, as Tiptap's mappable positions. In a collaborative editor these follow
     * other people's edits too: y-tiptap applies those by replacing the whole document, which a
     * plain mapping can only report as deleted, so the Collaboration extension anchors them in the
     * shared Y.Doc instead. A formula being edited also keeps the spot right after it (`after`):
     * someone typing right against one side of it can move one spot off the formula, not both.
     */
    before: MappablePosition;
    after: MappablePosition | null;
    /** Stays the same while `pos` moves, so the popover keeps what you typed. */
    id: number;
};

let nextId = 1;

export const mathEditKey = new PluginKey<MathEditTarget | null>('mathEdit');

function isMath(node: ProseMirrorNode | null | undefined): boolean {
    return node?.type.name === 'inlineMath' || node?.type.name === 'blockMath';
}

function isMathAt(doc: ProseMirrorNode, pos: number): boolean {
    return pos >= 0 && pos < doc.content.size && isMath(doc.nodeAt(pos));
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        mathEdit: {
            /** Opens the formula editor for a formula at the cursor or at `options.pos`. */
            openMathEditor: (options?: { pos?: number; mode?: 'edit' | 'insert' }) => ReturnType;
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
            openMathEditor: (options) => ({ editor, state, dispatch }) => {
                if (dispatch) {
                    const pos = options?.pos ?? state.selection.from;
                    const nodeAtPos = state.doc.nodeAt(pos);
                    // Without a mode, only a selected formula is edited (e.g. reached with the arrow
                    // keys); a cursor merely next to one gets a new formula.
                    const selected = options?.pos === undefined && state.selection instanceof NodeSelection;
                    const wantsEdit = options?.mode ? options.mode === 'edit' : selected;
                    const mode = wantsEdit && isMath(nodeAtPos) ? 'edit' : 'insert';
                    const node = mode === 'edit' ? nodeAtPos : null;
                    const nodeSize = node?.nodeSize ?? 0;
                    const target: MathEditTarget = {
                        mode,
                        pos,
                        before: editor.utils.createMappablePosition(pos),
                        after: mode === 'edit' ? editor.utils.createMappablePosition(pos + nodeSize) : null,
                        id: nextId++,
                    };
                    dispatch(state.tr.setMeta(mathEditKey, target));
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
        const { editor } = this;
        /** Where `position` is after `tr`, or null when `tr` deleted it. */
        const kept = (position: MappablePosition, tr: Transaction): MappablePosition | null => {
            const { position: next, mapResult } = editor.utils.getUpdatedPosition(position, tr);
            return mapResult?.deleted ? null : next;
        };

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
                    if (target.mode === 'insert') {
                        const { position: before } = editor.utils.getUpdatedPosition(target.before, tr);
                        return { ...target, pos: before.position, before };
                    }

                    const before = kept(target.before, tr);
                    const after = target.after ? kept(target.after, tr) : null;
                    // Formulas are leaf nodes: one ends a single position after it starts.
                    const pos = [before?.position ?? -1, (after?.position ?? 0) - 1].find((at) => isMathAt(tr.doc, at));
                    if (!before || pos === undefined) {
                        return null;
                    }
                    return { ...target, pos, before, after };
                },
            },
            props: {
                handleClickOn(view, _pos, node, nodePos) {
                    if (!view.editable || !isMath(node)) {
                        return false;
                    }
                    const target: MathEditTarget = {
                        mode: 'edit',
                        pos: nodePos,
                        before: editor.utils.createMappablePosition(nodePos),
                        after: editor.utils.createMappablePosition(nodePos + node.nodeSize),
                        id: nextId++,
                    };
                    view.dispatch(view.state.tr.setMeta(mathEditKey, target));
                    return true;
                },
            },
        })];
    },
});

function parseInlines(text: string, schema: Schema): ProseMirrorNode[] {
    const inlines: ProseMirrorNode[] = [];
    const inlineRegex = /\$([^\s$](?:[^$\n]*[^\s$\\])?)\$|\$\s*([^$\n]+?)\s*\$/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = inlineRegex.exec(text)) !== null) {
        if (m.index > last) {
            inlines.push(schema.text(text.slice(last, m.index)));
        }
        const latex = (m[1] || m[2]).trim();
        if (latex && schema.nodes.inlineMath) {
            inlines.push(schema.nodes.inlineMath.create({ latex }));
        }
        last = m.index + m[0].length;
    }
    if (last < text.length) {
        inlines.push(schema.text(text.slice(last)));
    }
    return inlines;
}

function parsePastedMathText(text: string, schema: Schema): ProseMirrorNode[] {
    const blockRegex = /\$\$([\s\S]+?)\$\$/g;
    const nodes: ProseMirrorNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = blockRegex.exec(text)) !== null) {
        if (m.index > last) {
            const chunk = text.slice(last, m.index);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    const inlines = parseInlines(line, schema);
                    if (inlines.length > 0 && schema.nodes.paragraph) {
                        nodes.push(schema.nodes.paragraph.create(null, inlines));
                    }
                }
            }
        }
        const latex = m[1].trim();
        if (latex && schema.nodes.blockMath) {
            nodes.push(schema.nodes.blockMath.create({ latex }));
        }
        last = m.index + m[0].length;
    }
    if (last < text.length) {
        const chunk = text.slice(last);
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.trim()) {
                const inlines = parseInlines(line, schema);
                if (inlines.length > 0 && schema.nodes.paragraph) {
                    nodes.push(schema.nodes.paragraph.create(null, inlines));
                }
            }
        }
    }
    return nodes;
}

function pasteMathText(view: EditorView, text: string, schema: Schema): boolean {
    const nodes = parsePastedMathText(text, schema);
    if (nodes.length === 0) {
        return false;
    }

    const { state, dispatch } = view;
    // Single line with only inline content: insert inline content directly into current paragraph
    if (nodes.length === 1 && nodes[0].type.name === 'paragraph' && !text.includes('\n')) {
        const slice = new Slice(nodes[0].content, 0, 0);
        dispatch(state.tr.replaceSelection(slice).scrollIntoView());
        return true;
    }

    // Contains blockMath or multiple lines: insert block slice
    const slice = new Slice(Fragment.from(nodes), 0, 0);
    dispatch(state.tr.replaceSelection(slice).scrollIntoView());
    return true;
}

/**
 * Formulas for every editor on the site: Tiptap's math nodes rendered with KaTeX, typed and
 * pasted as `$…$` and `$$…$$`, and editable by clicking (MathEditPopover in the toolbar).
 */
export const LatexMath = Extension.create({
    name: 'latexMath',

    addExtensions() {
        return [LatexBlockMath, LatexInlineMath, MathEditing];
    },

    addProseMirrorPlugins() {
        const { editor } = this;
        return [
            new Plugin({
                props: {
                    handlePaste(view, event) {
                        const text = event.clipboardData?.getData('text/plain');
                        if (!text || !text.includes('$')) {
                            return false;
                        }
                        // Formatted content (bold, lists, a copied question) keeps its formatting: the
                        // paste rules turn the formulas in it into math. Only plain text is rebuilt
                        // here, or a $$ block spread over lines, which the paste rules never see whole.
                        const formatted = event.clipboardData?.types.includes('text/html') ?? false;
                        if (formatted && !/\$\$[^$]*\n[^$]*\$\$/.test(text)) {
                            return false;
                        }
                        const hasMath = /\$\$[\s\S]+?\$\$|\$[^$\n]+\$/.test(text);
                        if (!hasMath) {
                            return false;
                        }
                        return pasteMathText(view, text, editor.schema);
                    },
                },
            }),
        ];
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
export function saveMath(editor: Editor, target: MathEditTarget, latex: string, asBlock: boolean = false) {
    let value = latex.trim();
    // Only dollars around something: "$$" alone is not an empty formula.
    if (value.startsWith('$$') && value.endsWith('$$') && value.length > 4) {
        value = value.slice(2, -2).trim();
        asBlock = true;
    } else if (value.startsWith('$') && !value.startsWith('$$') && value.endsWith('$') && value.length > 2) {
        value = value.slice(1, -1).trim();
    }

    const chain = editor.chain().focus();

    if (target.mode === 'insert') {
        if (value !== '') {
            if (asBlock && editor.schema.nodes.blockMath) {
                chain.command(({ tr, state }) => {
                    const block = editor.schema.nodes.blockMath.create({ latex: value });
                    // As if typed: you carry on writing on the line below it.
                    insertBlockFormula(tr, state, target.pos, target.pos, block, true);
                    return true;
                });
            } else {
                chain.insertContentAt(target.pos, { type: 'inlineMath', attrs: { latex: value } });
            }
        }
        chain.closeMathEditor().run();
        return;
    }

    const node = editor.state.doc.nodeAt(target.pos);
    if (!node || !isMath(node)) {
        chain.closeMathEditor().run();
        return;
    }

    chain.command(({ tr, state }) => {
        if (value === '') {
            tr.delete(target.pos, target.pos + node.nodeSize);
        } else {
            const currentIsBlock = node.type.name === 'blockMath';
            if (asBlock !== currentIsBlock) {
                if (asBlock && editor.schema.nodes.blockMath) {
                    const block = editor.schema.nodes.blockMath.create({ latex: value });
                    insertBlockFormula(tr, state, target.pos, target.pos + node.nodeSize, block, false);
                } else if (!asBlock && editor.schema.nodes.inlineMath && editor.schema.nodes.paragraph) {
                    const inline = editor.schema.nodes.inlineMath.create({ latex: value });
                    tr.replaceWith(target.pos, target.pos + node.nodeSize, editor.schema.nodes.paragraph.create(null, inline));
                }
            } else {
                tr.setNodeMarkup(target.pos, undefined, { ...node.attrs, latex: value });
            }
        }
        return true;
    });
    chain.closeMathEditor().run();
}
