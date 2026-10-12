'use client'

import { useExamEditor } from '@/components/exam/ExamContext';
import { useExamImageLink } from '@/components/exam/examImageLinks';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

/**
 * How an uploaded image looks: the image itself once its link is in, otherwise a box of the same
 * shape saying it is loading, was removed by a moderator, or cannot be shown.
 */
export default function ExamImageView({ node, selected }: ReactNodeViewProps) {
    const { t } = useTranslation();
    const { examId } = useExamEditor();
    const uuid = typeof node.attrs.uuid === 'string' ? node.attrs.uuid : null;
    const width = typeof node.attrs.width === 'number' ? node.attrs.width : undefined;
    const height = typeof node.attrs.height === 'number' ? node.attrs.height : undefined;
    const { link, retry } = useExamImageLink(examId, uuid);

    return (
        <NodeViewWrapper className={clsx('exam-image', selected && 'is-selected')} data-drag-handle="">
            {link.status === 'ready' ? (
                // A private, short-lived link: never a candidate for the optimizer's cache.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={link.url} width={width} height={height} alt="" draggable={false} onError={retry} />
            ) : (
                <span
                    className={clsx('exam-image-placeholder', link.status === 'loading' && 'animate-pulse')}
                    // Keeps the image's place while it loads; a removed one needs no more than a line.
                    style={link.status === 'loading' && width && height ? { aspectRatio: `${width} / ${height}`, maxWidth: width } : undefined}
                >
                    {link.status !== 'loading' && t(`exam.images.${link.status}`)}
                </span>
            )}
        </NodeViewWrapper>
    );
}
