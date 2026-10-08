'use client'

import { ApiClient } from '@/actions/api';
import { isErrorResponse } from '@/hooks/useApi';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * What the page knows about one image: a link to show it from, that a moderator removed it, or
 * that it is not part of this exam (e.g. pasted from another reconstruction).
 */
export type ExamImageLink =
    | { status: 'loading' }
    | { status: 'ready'; url: string }
    | { status: 'removed' }
    | { status: 'unavailable' };

const LOADING: ExamImageLink = { status: 'loading' };
const REMOVED: ExamImageLink = { status: 'removed' };
const UNAVAILABLE: ExamImageLink = { status: 'unavailable' };

/** An image that failed to load asks for a fresh link at most this often. */
const RETRY_AFTER_MS = 60_000;

type ApiImages = Record<string, { url?: unknown; removed?: unknown }>;

/**
 * The short-lived links to one exam's images (GET /api/exams/{id}/image-urls), shared by every
 * image on the page. Images are not public, so the document only holds their UUIDs.
 *
 * One request covers every image: server actions run one at a time, so a request per image
 * would load a long reconstruction image by image. A link expires after ten minutes, but an
 * image that has loaded stays on screen; only when it has to load again and fails does it ask
 * for a fresh link (`retry`). A link that still works is kept, so nothing downloads twice.
 */
class ExamImageLinks {
    private readonly links = new Map<string, ExamImageLink>();
    private readonly wanted = new Set<string>();
    private readonly lastRetry = new Map<string, number>();
    private readonly listeners = new Set<() => void>();
    private scheduled = false;
    private loading = false;

    constructor(private readonly examId: number) {}

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    get(uuid: string): ExamImageLink {
        return this.links.get(uuid) ?? LOADING;
    }

    /** Asks for a link to an image this page has none for yet. */
    want(uuid: string) {
        if (!this.links.has(uuid)) {
            this.wanted.add(uuid);
            this.schedule();
        }
    }

    /** A link that came with an upload: no need to ask. */
    prime(uuid: string, url: string) {
        this.links.set(uuid, { status: 'ready', url });
        this.notify();
    }

    /** The image failed to load from `url`, most likely because the link expired. */
    retry(uuid: string, url: string) {
        const current = this.links.get(uuid);
        if (current?.status !== 'ready' || current.url !== url) {
            return;
        }
        const now = Date.now();
        if (now - (this.lastRetry.get(uuid) ?? 0) < RETRY_AFTER_MS) {
            // A fresh link failed too: the file itself is the problem.
            this.links.set(uuid, UNAVAILABLE);
            this.notify();
            return;
        }
        this.lastRetry.set(uuid, now);
        this.links.delete(uuid);
        this.want(uuid);
        this.notify();
    }

    private schedule() {
        if (this.scheduled || this.loading) {
            return;
        }
        this.scheduled = true;
        // Every image of the page mounts at about the same moment; one request serves them all.
        setTimeout(() => {
            this.scheduled = false;
            void this.load();
        }, 0);
    }

    private async load() {
        this.loading = true;
        const asked = new Set(this.wanted);
        this.wanted.clear();

        let images: ApiImages | null = null;
        try {
            const result = await ApiClient('GET', `/api/exams/${this.examId}/image-urls`);
            if (!isErrorResponse(result)) {
                images = (result as { images?: ApiImages } | null)?.images ?? null;
            }
        } catch {
            // A redirect to the login page surfaces here; Next.js carries it out.
        }

        for (const uuid of asked) {
            const image = images?.[uuid];
            if (images === null) {
                // The request failed; the images that asked stay without a link.
                this.links.set(uuid, UNAVAILABLE);
            } else if (image?.removed === true) {
                this.links.set(uuid, REMOVED);
            } else if (typeof image?.url === 'string') {
                // Local storage answers with a path on the backend, S3 with an absolute link.
                this.links.set(uuid, { status: 'ready', url: new URL(image.url, process.env.NEXT_PUBLIC_BACKEND_URL).toString() });
            } else {
                this.links.set(uuid, UNAVAILABLE);
            }
        }

        this.loading = false;
        this.notify();
        if (this.wanted.size > 0) {
            this.schedule();
        }
    }

    private notify() {
        this.listeners.forEach((listener) => listener());
    }
}

const perExam = new Map<number, ExamImageLinks>();

export function examImageLinks(examId: number): ExamImageLinks {
    let links = perExam.get(examId);
    if (!links) {
        links = new ExamImageLinks(examId);
        perExam.set(examId, links);
    }
    return links;
}

/** The link for one image while it is on the page, and what to call when it fails to load. */
export function useExamImageLink(examId: number | null, uuid: string | null) {
    const links = examId !== null ? examImageLinks(examId) : null;
    const subscribe = useCallback(
        (listener: () => void) => (links ? links.subscribe(listener) : () => {}),
        [links],
    );
    const link = useSyncExternalStore(
        subscribe,
        () => (links && uuid ? links.get(uuid) : UNAVAILABLE),
        () => LOADING,
    );

    useEffect(() => {
        if (links && uuid) {
            links.want(uuid);
        }
    }, [links, uuid]);

    const retry = useCallback(() => {
        if (links && uuid && link.status === 'ready') {
            links.retry(uuid, link.url);
        }
    }, [links, uuid, link]);

    return { link, retry };
}
