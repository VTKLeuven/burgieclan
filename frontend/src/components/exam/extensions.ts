import { ExamImage } from '@/components/exam/ExamImage';
import { EXAM_QUESTION, ExamQuestion } from '@/components/exam/ExamQuestion';
import { Mathematics } from '@tiptap/extension-mathematics';
import { UniqueID } from '@tiptap/extension-unique-id';
import { isChangeOrigin } from '@tiptap/extension-collaboration';
import { Node, type Extensions } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';

/**
 * A reconstruction is a sequence of questions, with free blocks in between for general notes or
 * headings like "Deel 2: oefeningen". Questions cannot nest: they are not in the "block" group.
 */
const ExamDocument = Node.create({
    name: 'doc',
    topNode: true,
    content: `(block | ${EXAM_QUESTION})+`,
});

/**
 * The editor schema of an exam reconstruction, shared by the live editor and the read-only
 * copy. It lives only here: the collab server stores documents as plain Yjs XML without it.
 *
 * `collaborative` switches off TipTap's own history (Collaboration brings an undo that only
 * undoes your own changes) and has UniqueID ignore changes that come from other people, who
 * already gave their questions an id.
 */
export function examExtensions({ collaborative }: { collaborative: boolean }): Extensions {
    return [
        StarterKit.configure({
            document: false,
            undoRedo: collaborative ? false : undefined,
            // Several people each adding "a trailing paragraph" at the same time ends up as a
            // pile of empty paragraphs. The gap cursor reaches the space after the last question.
            trailingNode: false,
            dropcursor: { color: '#0e1a36', width: 2 },
        }),
        ExamDocument,
        ExamQuestion,
        ExamImage,
        Mathematics,
        UniqueID.configure({
            types: [EXAM_QUESTION],
            filterTransaction: collaborative ? (transaction) => !isChangeOrigin(transaction) : null,
            updateDocument: collaborative,
        }),
    ];
}
