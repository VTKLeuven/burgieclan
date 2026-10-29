import ExamQuestionView from '@/components/exam/ExamQuestionView';
import { isChangeOrigin } from '@tiptap/extension-collaboration';
import { NodeRange, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { mergeAttributes, Node, ReactNodeViewRenderer, type JSONContent } from '@tiptap/react';

export const EXAM_QUESTION = 'examQuestion';

declare module '@tiptap/react' {
    interface Commands<ReturnType> {
        examQuestion: {
            /**
             * Adds an empty question after the block the cursor is in, or at the end when
             * `atEnd` is set, and puts the cursor in it. An empty paragraph there is replaced
             * rather than left behind.
             */
            insertExamQuestion: (options?: { atEnd?: boolean }) => ReturnType;
            /** Swaps the question at `pos` with the block before (-1) or after (1) it. */
            moveExamQuestion: (pos: number, direction: -1 | 1) => ReturnType;
            /** Marks or unmarks that the question at `pos` came up on this day. */
            toggleExamQuestionSitting: (pos: number, sittingId: string) => ReturnType;
            /** Forgets a day on every question, after the day itself was removed. */
            removeSittingFromQuestions: (sittingId: string) => ReturnType;
        };
    }
}

function sittingsOf(node: ProseMirrorNode): string[] {
    const value: unknown = node.attrs.sittings;
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

/** How many questions are marked as having come up on this day. */
export function countQuestionsWithSitting(doc: ProseMirrorNode, sittingId: string): number {
    let count = 0;
    doc.forEach((node) => {
        if (node.type.name === EXAM_QUESTION && sittingsOf(node).includes(sittingId)) {
            count++;
        }
    });
    return count;
}

const EMPTY_QUESTION: JSONContent = { type: EXAM_QUESTION, content: [{ type: 'paragraph' }] };

/** A document nobody wrote in yet: the editor shows it as one empty paragraph. */
function isEmptyDocument(doc: ProseMirrorNode): boolean {
    const only = doc.childCount === 1 ? doc.firstChild : null;
    return only !== null && only.type.name === 'paragraph' && only.content.size === 0;
}

function hasQuestion(doc: ProseMirrorNode): boolean {
    let found = false;
    doc.forEach((node) => {
        found ||= node.type.name === EXAM_QUESTION;
    });
    return found;
}

/**
 * One question of an exam reconstruction: any block content (text, lists, math, code), the days
 * it came up on (`sittings`, ids from the document's "sittings" array), and a permanent `id`
 * from the UniqueID extension that later features (comments, "I had this too") attach to.
 *
 * Questions only live at the top level of the document, between free blocks for general notes,
 * and are numbered with a CSS counter (see .exam-question in globals.css), so numbers follow
 * reordering without anyone renumbering. The collab server has no copy of this schema: it keeps
 * questions as plain Yjs XML (see collab/README.md).
 */
export const ExamQuestion = Node.create({
    name: EXAM_QUESTION,
    content: 'block+',
    defining: true,
    isolating: true,
    draggable: true,

    addAttributes() {
        return {
            sittings: {
                default: [],
                parseHTML: (element) => {
                    try {
                        const parsed: unknown = JSON.parse(element.getAttribute('data-sittings') ?? '[]');
                        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
                    } catch {
                        return [];
                    }
                },
                renderHTML: (attributes) => ({ 'data-sittings': JSON.stringify(attributes.sittings ?? []) }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'section[data-exam-question]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['section', mergeAttributes(HTMLAttributes, { 'data-exam-question': '' }), 0];
    },

    addKeyboardShortcuts() {
        return {
            // A new question right after the one you are typing in.
            'Mod-Shift-Enter': () => this.editor.commands.insertExamQuestion(),
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(ExamQuestionView, { as: 'section', className: 'exam-question' });
    },

    addProseMirrorPlugins() {
        const type = this.type;
        return [
            new Plugin({
                key: new PluginKey('examFirstQuestion'),
                /*
                 * The first thing written into an empty reconstruction becomes question 1: left as
                 * a loose block, it would count as no question, stay out of search, and take no
                 * comments. It is converted as it is written, not when the page opens: everyone
                 * opening a new exam at once would each add an empty question, which Yjs keeps
                 * side by side. Edits from other people are theirs to convert.
                 */
                appendTransaction: (transactions, oldState, newState) => {
                    const written = transactions.some((transaction) => transaction.docChanged && !isChangeOrigin(transaction));
                    const { doc } = newState;
                    if (!written || !isEmptyDocument(oldState.doc) || isEmptyDocument(doc) || hasQuestion(doc)) {
                        return null;
                    }

                    return newState.tr.wrap(new NodeRange(doc.resolve(0), doc.resolve(doc.content.size), 0), [{ type }]);
                },
            }),
        ];
    },

    addCommands() {
        return {
            insertExamQuestion: (options) => ({ state, chain }) => {
                const { doc, selection } = state;
                let from = doc.content.size;
                let to = from;

                if (!options?.atEnd && selection.$from.depth > 0) {
                    from = selection.$from.after(1);
                    to = from;
                }

                // The block to replace or follow: the last one, or the one the cursor is in.
                const index = from === doc.content.size ? doc.childCount - 1 : selection.$from.index(0);
                const block = index >= 0 ? doc.child(index) : null;
                if (block && block.type.name === 'paragraph' && block.content.size === 0) {
                    let blockStart = 0;
                    for (let i = 0; i < index; i++) {
                        blockStart += doc.child(i).nodeSize;
                    }
                    from = blockStart;
                    to = blockStart + block.nodeSize;
                }

                return chain()
                    .insertContentAt({ from, to }, EMPTY_QUESTION)
                    // Inside the new question's paragraph: question start + 1, paragraph + 1.
                    .setTextSelection(from + 2)
                    .scrollIntoView()
                    .run();
            },

            moveExamQuestion: (pos, direction) => ({ state, tr, dispatch }) => {
                const node = state.doc.nodeAt(pos);
                const $pos = state.doc.resolve(pos);
                if (!node || node.type.name !== EXAM_QUESTION || $pos.depth !== 0) {
                    return false;
                }

                const targetIndex = $pos.index(0) + direction;
                if (targetIndex < 0 || targetIndex >= state.doc.childCount) {
                    return false;
                }

                if (dispatch) {
                    const sibling = state.doc.child(targetIndex);
                    if (direction === -1) {
                        tr.delete(pos, pos + node.nodeSize).insert(pos - sibling.nodeSize, node);
                    } else {
                        // Insert first: the positions before the question do not move.
                        tr.insert(pos + node.nodeSize + sibling.nodeSize, node).delete(pos, pos + node.nodeSize);
                    }
                    dispatch(tr.scrollIntoView());
                }

                return true;
            },

            toggleExamQuestionSitting: (pos, sittingId) => ({ state, tr, dispatch }) => {
                const node = state.doc.nodeAt(pos);
                if (!node || node.type.name !== EXAM_QUESTION) {
                    return false;
                }

                const current = sittingsOf(node);
                const next = current.includes(sittingId)
                    ? current.filter((id) => id !== sittingId)
                    : [...current, sittingId];

                if (dispatch) {
                    dispatch(tr.setNodeAttribute(pos, 'sittings', next));
                }
                return true;
            },

            removeSittingFromQuestions: (sittingId) => ({ state, tr, dispatch }) => {
                let changed = false;
                state.doc.forEach((node, offset) => {
                    if (node.type.name === EXAM_QUESTION && sittingsOf(node).includes(sittingId)) {
                        tr.setNodeAttribute(offset, 'sittings', sittingsOf(node).filter((id) => id !== sittingId));
                        changed = true;
                    }
                });

                if (changed && dispatch) {
                    dispatch(tr);
                }
                return true;
            },
        };
    },
});
