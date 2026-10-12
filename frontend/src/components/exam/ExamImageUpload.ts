import { ApiClient } from '@/actions/api';
import { EXAM_IMAGE } from '@/components/exam/ExamImage';
import { examImageLinks } from '@/components/exam/examImageLinks';
import { isErrorResponse } from '@/hooks/useApi';
import { Extension, type Editor } from '@tiptap/react';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { absolutePositionToRelativePosition, relativePositionToAbsolutePosition, ySyncPluginKey } from '@tiptap/y-tiptap';
import type * as Y from 'yjs';

/** ExamImageStore::TYPES and ExamImage::MAX_BYTES in the backend. */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Why an upload was refused, as POST /api/exams/{id}/images says it ("reason"), or "failed" when
 * it gave no reason.
 */
export type ImageUploadProblem =
    'type' | 'unreadable' | 'pixels' | 'size' | 'limit' | 'locked' | 'rate' | 'failed';

/** What goes into the document for an uploaded image (the examImage node's attributes). */
export interface UploadedExamImage {
    uuid: string;
    width: number;
    height: number;
}

export type ImageUploadResult = { image: UploadedExamImage } | { problem: ImageUploadProblem };

const KNOWN_PROBLEMS: readonly ImageUploadProblem[] = ['type', 'unreadable', 'pixels', 'size', 'limit', 'locked', 'rate'];

/**
 * Uploads one image to an exam; checks type and size first, so obvious mistakes need no round trip.
 * The link that comes back shows the image at once, without asking for it again.
 */
export async function uploadExamImage(examId: number, file: File): Promise<ImageUploadResult> {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return { problem: 'type' };
    }
    if (file.size > MAX_IMAGE_BYTES) {
        return { problem: 'size' };
    }

    const body = new FormData();
    body.append('file', file);
    const result = await ApiClient('POST', `/api/exams/${examId}/images`, body);

    if (isErrorResponse(result)) {
        const reason = result.error.reason as ImageUploadProblem | undefined;
        if (reason && KNOWN_PROBLEMS.includes(reason)) {
            return { problem: reason };
        }
        // nginx answers an oversized body itself, without our JSON.
        return { problem: result.error.status === 413 ? 'size' : 'failed' };
    }
    const { uuid, url, width, height } = (result ?? {}) as Record<string, unknown>;
    if (typeof uuid !== 'string' || typeof url !== 'string' || typeof width !== 'number' || typeof height !== 'number') {
        return { problem: 'failed' };
    }
    // Local storage answers with a path on the backend, S3 with an absolute link.
    examImageLinks(examId).prime(uuid, new URL(url, process.env.NEXT_PUBLIC_BACKEND_URL).toString());

    return { image: { uuid, width, height } };
}

export interface ExamImageUploadOptions {
    /** Uploads one file; reports a refusal itself (e.g. as a toast) and returns null then. */
    upload: (file: File) => Promise<UploadedExamImage | null>;
    /** What the placeholder says while an image uploads. */
    uploadingLabel: string;
}

/**
 * An image on its way up, at the spot it goes. Your own edits move `pos` through the
 * transaction's mapping. Everyone else's edits cannot: y-tiptap applies them by replacing the
 * whole ProseMirror document, which a mapping can only report as deleted. `anchor` finds the spot
 * again then: a position in the shared Y.Doc, the same kind collaborators' cursors use.
 */
interface Placeholder {
    id: object;
    pos: number;
    anchor: Y.RelativePosition | null;
    widget: HTMLElement;
}

interface PlaceholderState {
    placeholders: Placeholder[];
    decorations: DecorationSet;
}

const placeholders = new PluginKey<PlaceholderState>('examImageUpload');

type PlaceholderAction = { add: Placeholder } | { remove: { id: object } };

/** What the Collaboration extension's sync plugin keeps: the shared document and its node mapping. */
interface SyncState {
    doc: Y.Doc;
    type: Y.XmlFragment;
    binding: { mapping: Parameters<typeof relativePositionToAbsolutePosition>[3] } | null;
}

function syncState(state: EditorState): SyncState | undefined {
    return ySyncPluginKey.getState(state) as SyncState | undefined;
}

function placeholderPosition(state: EditorState, id: object): number | null {
    return placeholders.getState(state)?.placeholders.find((placeholder) => placeholder.id === id)?.pos ?? null;
}

/**
 * Where each placeholder is after `tr`. After someone else's edit (or an undo, which y-tiptap
 * applies the same way) the binding's mapping already describes the new document. A spot that
 * cannot be found any more, e.g. because its question was deleted, ends up where the mapping puts
 * it, the end of the document: the image is kept rather than lost.
 */
function moved(list: Placeholder[], tr: Transaction, oldState: EditorState): Placeholder[] {
    const remote = (tr.getMeta(ySyncPluginKey) as { isChangeOrigin?: boolean } | undefined)?.isChangeOrigin === true;
    const sync = remote ? syncState(oldState) : undefined;
    const size = tr.doc.content.size;

    return list.map((placeholder) => {
        const anchored = sync?.binding && placeholder.anchor
            ? relativePositionToAbsolutePosition(sync.doc, sync.type, placeholder.anchor, sync.binding.mapping)
            : null;
        const pos = anchored ?? tr.mapping.map(placeholder.pos);
        return { ...placeholder, pos: Math.min(Math.max(pos, 0), size) };
    });
}

/**
 * Uploads images and puts them where they were pasted, dropped or chosen. While a file uploads,
 * only you see a placeholder there (a decoration, not part of the document); it follows your
 * and everyone else's edits, and is replaced by the image once the upload is done, so the
 * document never holds anything but finished images.
 */
export function insertExamImages(view: EditorView, files: File[], pos: number, options: ExamImageUploadOptions) {
    const sync = syncState(view.state);
    // The document and the Y.Doc agree here: the sync plugin copies every change across as it is made.
    const anchor = sync?.binding ? absolutePositionToRelativePosition(pos, sync.type, sync.binding.mapping) : null;

    for (const file of files) {
        const id = {};
        const widget = document.createElement('span');
        widget.className = 'exam-image-placeholder';
        widget.textContent = options.uploadingLabel;
        const add: PlaceholderAction = { add: { id, pos, anchor, widget } };
        view.dispatch(view.state.tr.setMeta(placeholders, add));

        void options.upload(file).then((uploaded) => {
            if (view.isDestroyed) {
                return;
            }
            const at = placeholderPosition(view.state, id);
            const remove: PlaceholderAction = { remove: { id } };
            const tr = view.state.tr.setMeta(placeholders, remove);
            const image = view.state.schema.nodes[EXAM_IMAGE];
            if (uploaded !== null && at !== null && image) {
                tr.replaceRangeWith(at, at, image.create(uploaded));
            }
            view.dispatch(tr);
        });
    }
}

function imagesIn(list: FileList | null | undefined): File[] {
    return Array.from(list ?? []).filter((file) => file.type.startsWith('image/'));
}

type ExamImageUploadStorage = { options: ExamImageUploadOptions | null };

// Storage lives in @tiptap/core; @tiptap/react only re-exports it.
declare module '@tiptap/core' {
    interface Storage {
        examImageUpload: ExamImageUploadStorage;
    }
}

/**
 * Pasting or dropping image files into the editor uploads them (insertExamImages). Only for the
 * live editor. The page hands it its options with setExamImageUploadOptions (null while you cannot
 * edit), so the editor need not be recreated when they change.
 */
export const ExamImageUpload = Extension.create<object, ExamImageUploadStorage>({
    name: 'examImageUpload',

    addStorage() {
        return { options: null };
    },

    addProseMirrorPlugins() {
        const current = () => this.storage.options;

        return [
            new Plugin<PlaceholderState>({
                key: placeholders,
                state: {
                    init: () => ({ placeholders: [], decorations: DecorationSet.empty }),
                    apply(tr, value, oldState) {
                        let list = tr.docChanged && value.placeholders.length > 0
                            ? moved(value.placeholders, tr, oldState)
                            : value.placeholders;
                        const action = tr.getMeta(placeholders) as PlaceholderAction | undefined;
                        if (action && 'add' in action) {
                            list = [...list, action.add];
                        } else if (action && 'remove' in action) {
                            list = list.filter((placeholder) => placeholder.id !== action.remove.id);
                        }
                        if (list === value.placeholders) {
                            return value;
                        }
                        return {
                            placeholders: list,
                            decorations: DecorationSet.create(
                                tr.doc,
                                list.map((placeholder) => Decoration.widget(placeholder.pos, placeholder.widget, { id: placeholder.id })),
                            ),
                        };
                    },
                },
                props: {
                    decorations(state) {
                        return placeholders.getState(state)?.decorations;
                    },
                    handlePaste(view, event) {
                        const options = current();
                        const files = imagesIn(event.clipboardData?.files);
                        if (!options || files.length === 0 || !view.editable) {
                            return false;
                        }
                        event.preventDefault();
                        insertExamImages(view, files, view.state.selection.from, options);
                        return true;
                    },
                    handleDrop(view, event) {
                        const options = current();
                        const files = imagesIn(event.dataTransfer?.files);
                        if (!options || files.length === 0 || !view.editable) {
                            return false;
                        }
                        event.preventDefault();
                        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
                            ?? view.state.selection.from;
                        insertExamImages(view, files, pos, options);
                        return true;
                    },
                },
            }),
        ];
    },
});

export function setExamImageUploadOptions(editor: Editor, options: ExamImageUploadOptions | null) {
    editor.storage.examImageUpload.options = options;
}
