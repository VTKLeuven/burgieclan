import ExamImageView from '@/components/exam/ExamImageView';
import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react';

export const EXAM_IMAGE = 'examImage';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function dimension(element: HTMLElement, name: string): number | null {
    const value = Number.parseInt(element.getAttribute(name) ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * An uploaded image in a reconstruction: a block, inside a question or between questions.
 *
 * The document holds only the image's UUID and size, never the image (base64 would bloat every
 * store and every revision) and never a URL: images are not public, so ExamImageView fetches a
 * short-lived link for it (examImageLinks). The size lets the page keep the image's place while
 * it loads.
 *
 * Copying it within the editor keeps it; an <img> from anywhere else is dropped, since only our
 * own uploads are allowed. Images come in through ExamImageUpload.
 */
export const ExamImage = Node.create({
    name: EXAM_IMAGE,
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            uuid: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-exam-image'),
                renderHTML: (attributes: { uuid?: string | null }) => ({ 'data-exam-image': attributes.uuid }),
            },
            width: {
                default: null,
                parseHTML: (element: HTMLElement) => dimension(element, 'width'),
            },
            height: {
                default: null,
                parseHTML: (element: HTMLElement) => dimension(element, 'height'),
            },
        };
    },

    parseHTML() {
        return [{
            tag: 'img[data-exam-image]',
            getAttrs: (element: HTMLElement) => (UUID.test(element.getAttribute('data-exam-image') ?? '') ? null : false),
        }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['img', mergeAttributes(HTMLAttributes, { alt: '' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ExamImageView);
    },
});
