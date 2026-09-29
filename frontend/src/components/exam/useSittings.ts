'use client'

import type { ExamSitting } from '@/types/entities';
import { useCallback, useEffect, useState } from 'react';
import * as Y from 'yjs';

/**
 * The shared array of days, next to the editor content in the same Y.Doc. The collab server
 * keeps it with the document and rolls it back together with the questions (JSON_FIELDS in
 * collab/src/server.ts).
 *
 * Each day is a Y.Map with an id and a label, so renaming one while someone else adds another
 * merges instead of one of the two edits getting lost.
 */
export const SITTINGS_FIELD = 'sittings';

export const MAX_SITTING_LABEL = 40;

function read(array: Y.Array<unknown>): ExamSitting[] {
    return array.toArray().flatMap((item) => {
        if (!(item instanceof Y.Map)) {
            return [];
        }
        const id: unknown = item.get('id');
        const label: unknown = item.get('label');
        return typeof id === 'string' && typeof label === 'string' ? [{ id, label }] : [];
    });
}

function newId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

export function useSittings(doc: Y.Doc | null) {
    const [sittings, setSittings] = useState<ExamSitting[]>([]);

    useEffect(() => {
        if (!doc) {
            return;
        }

        const array = doc.getArray<unknown>(SITTINGS_FIELD);
        const update = () => setSittings(read(array));
        update();
        array.observeDeep(update);

        return () => array.unobserveDeep(update);
    }, [doc]);

    const add = useCallback((label: string) => {
        const trimmed = label.trim().slice(0, MAX_SITTING_LABEL);
        if (!doc || trimmed === '') {
            return;
        }

        const sitting = new Y.Map<string>();
        sitting.set('id', newId());
        sitting.set('label', trimmed);
        doc.getArray<unknown>(SITTINGS_FIELD).push([sitting]);
    }, [doc]);

    const rename = useCallback((id: string, label: string) => {
        const trimmed = label.trim().slice(0, MAX_SITTING_LABEL);
        if (!doc || trimmed === '') {
            return;
        }

        const item = doc.getArray<unknown>(SITTINGS_FIELD).toArray()
            .find((candidate) => candidate instanceof Y.Map && candidate.get('id') === id);
        if (item instanceof Y.Map) {
            item.set('label', trimmed);
        }
    }, [doc]);

    const remove = useCallback((id: string) => {
        if (!doc) {
            return;
        }

        const array = doc.getArray<unknown>(SITTINGS_FIELD);
        const index = array.toArray().findIndex((candidate) => candidate instanceof Y.Map && candidate.get('id') === id);
        if (index >= 0) {
            array.delete(index, 1);
        }
    }, [doc]);

    return { sittings, add, rename, remove };
}
