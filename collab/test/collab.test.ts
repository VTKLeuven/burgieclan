import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, afterEach, before, describe, it } from 'node:test';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Server } from '@hocuspocus/server';
import { SignJWT } from 'jose';
import * as Y from 'yjs';
import { createBackend, HEADER_SIGNATURE, HEADER_TIMESTAMP, signRequest } from '../src/backend.ts';
import { createCollabServer, EDITOR_FIELD, TOO_LARGE_MESSAGE, type ConnectionContext } from '../src/server.ts';
import { TOKEN_AUDIENCE, TOKEN_ISSUER } from '../src/token.ts';

/**
 * Runs the real collab server against a fake Symfony and real Hocuspocus clients, the way two
 * browsers would use it.
 */

const SECRET = 'test-collab-secret-0123456789abcdef0123456789';

// ---------------------------------------------------------------------------------------------
// Fake Symfony: keeps documents in memory and checks signatures like CollabRequestSignature.
// ---------------------------------------------------------------------------------------------

interface StoredDocument {
    state: Buffer;
    content: unknown;
    fields: Record<string, unknown>;
    contributors: string[];
}

interface FakeBackend {
    url: string;
    documents: Map<string, StoredDocument>;
    stores: { name: string; contributors: string[] }[];
    requests: { method: string; path: string }[];
    failLoadsFor: Set<string>;
    close(): Promise<void>;
}

async function readBody(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks).toString('utf8');
}

async function startFakeBackend(): Promise<FakeBackend> {
    const documents = new Map<string, StoredDocument>();
    const stores: { name: string; contributors: string[] }[] = [];
    const requests: { method: string; path: string }[] = [];
    const failLoadsFor = new Set<string>();

    const server: HttpServer = createServer(async (request, response) => {
        const method = request.method ?? 'GET';
        const path = new URL(request.url ?? '/', 'http://backend').pathname;
        const body = await readBody(request);
        requests.push({ method, path });

        const timestamp = Number(request.headers[HEADER_TIMESTAMP.toLowerCase()]);
        const signature = request.headers[HEADER_SIGNATURE.toLowerCase()];
        if (signature !== signRequest(SECRET, method, path, timestamp, body)) {
            response.writeHead(401).end();
            return;
        }

        const match = /^\/internal\/collab\/documents\/([a-z0-9-]+)$/.exec(path);
        const name = match?.[1];
        if (!name) {
            response.writeHead(404).end();
            return;
        }

        if (method === 'GET') {
            if (failLoadsFor.has(name)) {
                response.writeHead(500).end();
                return;
            }
            const document = documents.get(name);
            if (!document) {
                response.writeHead(404).end();
                return;
            }
            response.writeHead(200, { 'Content-Type': 'application/octet-stream' }).end(document.state);
            return;
        }

        if (method === 'PUT') {
            const payload = JSON.parse(body) as Omit<StoredDocument, 'state'> & { state: string };
            documents.set(name, { ...payload, state: Buffer.from(payload.state, 'base64') });
            stores.push({ name, contributors: payload.contributors });
            response.writeHead(204).end();
            return;
        }

        response.writeHead(405).end();
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    return {
        url: `http://127.0.0.1:${port}`,
        documents,
        stores,
        requests,
        failLoadsFor,
        close: () => new Promise((resolve) => server.close(() => resolve())),
    };
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

interface TokenClaims {
    doc: string;
    mode: 'edit' | 'view';
    name: string;
    sub: string;
    until: number;
}

/** Mints a token the way CollabTokenIssuer does. */
async function mintToken(claims: Partial<TokenClaims> = {}, options: { secret?: string; expiresIn?: string } = {}) {
    const { doc = 'collab-test', mode = 'edit', name = 'Alice', sub = '1', until } = claims;

    return new SignJWT({ doc, mode, name, ...(until === undefined ? {} : { until }) })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(TOKEN_ISSUER)
        .setAudience(TOKEN_AUDIENCE)
        .setSubject(sub)
        .setIssuedAt()
        .setExpirationTime(options.expiresIn ?? '10m')
        .sign(new TextEncoder().encode(options.secret ?? SECRET));
}

async function waitFor(check: () => boolean, what: string, timeout = 3000): Promise<void> {
    const deadline = Date.now() + timeout;
    while (!check()) {
        if (Date.now() > deadline) {
            throw new Error(`Timed out waiting for ${what}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
}

/** Appends a paragraph the way TipTap's Collaboration extension stores one. */
function addParagraph(doc: Y.Doc, text: string): void {
    const paragraph = new Y.XmlElement('paragraph');
    paragraph.insert(0, [new Y.XmlText(text)]);
    doc.getXmlFragment(EDITOR_FIELD).push([paragraph]);
}

function paragraphs(doc: Y.Doc): string[] {
    return doc.getXmlFragment(EDITOR_FIELD).toArray().map((node) =>
        node instanceof Y.XmlElement ? node.toArray().map((child) => child.toString()).join('') : '',
    );
}

let collabUrl = '';
const openProviders: HocuspocusProvider[] = [];

interface Client {
    provider: HocuspocusProvider;
    doc: Y.Doc;
    scope: string | undefined;
}

/** Connects like a browser does and resolves once the document is synced. */
function connect(name: string, token: string | (() => Promise<string>)): Promise<Client> {
    return new Promise((resolve, reject) => {
        const doc = new Y.Doc();
        let scope: string | undefined;
        const provider = new HocuspocusProvider({
            url: collabUrl,
            name,
            document: doc,
            token,
            onAuthenticated: (data) => {
                scope = data.scope;
            },
            onSynced: () => resolve({ provider, doc, scope }),
            onAuthenticationFailed: (data) => {
                provider.destroy();
                reject(new Error(`authentication failed: ${data.reason}`));
            },
        });
        openProviders.push(provider);
    });
}

/** Calls an internal route the way CollabServerClient in Symfony does. */
function internalRequest(path: string, body: unknown, secret = SECRET): Promise<Response> {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000);

    return fetch(collabUrl.replace('ws://', 'http://') + path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            [HEADER_TIMESTAMP]: String(timestamp),
            [HEADER_SIGNATURE]: signRequest(secret, 'POST', path, timestamp, raw),
        },
        body: raw,
    });
}

// ---------------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------------

describe('collab server', () => {
    let backend: FakeBackend;
    let server: Server<ConnectionContext>;
    const warnings: string[] = [];
    /** Added to the server's clock, to get past a lock without waiting for it. */
    let clockOffset = 0;

    before(async () => {
        backend = await startFakeBackend();
        server = createCollabServer({
            port: 0,
            secret: SECRET,
            debounce: 50,
            maxDebounce: 200,
            stopOnSignals: false,
            backend: createBackend({ baseUrl: backend.url, secret: SECRET, retryDelay: 10 }),
            log: { info: () => {}, warn: (message: string) => warnings.push(message), error: () => {} },
            now: () => Date.now() + clockOffset,
            // Far above what the other tests write, easy to reach on purpose.
            maxDocumentBytes: 20_000,
        });
        await server.listen();
        collabUrl = `ws://127.0.0.1:${server.address.port}`;
    });

    afterEach(() => {
        for (const provider of openProviders.splice(0)) {
            provider.destroy();
        }
        clockOffset = 0;
    });

    after(async () => {
        await server.destroy();
        await backend.close();
    });

    it('signs requests exactly like the PHP side', () => {
        // Same vector as CollabRequestSignatureTest in the backend.
        assert.equal(
            signRequest(SECRET, 'put', '/internal/collab/documents/collab-test', 1700000000, '{"state":"AQI=","content":null}'),
            'sha256=d64da9e2d00802bb65daa29f5e5f5825d0fd7b57024116f9cb64ee7da8b7d161',
        );
    });

    it('answers the health check', async () => {
        const response = await fetch(`http://127.0.0.1:${server.address.port}/health`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { status: 'ok' });
    });

    it('shows one editor\'s changes to the other live', async () => {
        const alice = await connect('live-doc', await mintToken({ doc: 'live-doc', name: 'Alice', sub: '1' }));
        const bob = await connect('live-doc', await mintToken({ doc: 'live-doc', name: 'Bob', sub: '2' }));

        assert.equal(alice.scope, 'read-write');

        addParagraph(alice.doc, 'Vraag 1: bewijs de stelling');
        await waitFor(() => paragraphs(bob.doc).length === 1, 'Bob to receive Alice\'s paragraph');
        assert.deepEqual(paragraphs(bob.doc), ['Vraag 1: bewijs de stelling']);

        // Both typing in the same paragraph at once: Yjs merges, nobody loses text.
        const aliceText = alice.doc.getXmlFragment(EDITOR_FIELD).get(0) as Y.XmlElement;
        const bobText = bob.doc.getXmlFragment(EDITOR_FIELD).get(0) as Y.XmlElement;
        (aliceText.get(0) as Y.XmlText).insert(0, '[A] ');
        (bobText.get(0) as Y.XmlText).insert((bobText.get(0) as Y.XmlText).length, ' [B]');

        await waitFor(
            () => paragraphs(alice.doc)[0] === paragraphs(bob.doc)[0] && paragraphs(alice.doc)[0]?.includes('[B]') === true,
            'both edits to merge',
        );
        assert.equal(paragraphs(alice.doc)[0], '[A] Vraag 1: bewijs de stelling [B]');
    });

    it('stores the document with a TipTap JSON copy and loads it back for the next visitor', async () => {
        const alice = await connect('stored-doc', await mintToken({ doc: 'stored-doc' }));
        addParagraph(alice.doc, 'Hello');
        addParagraph(alice.doc, 'World');

        await waitFor(() => backend.documents.get('stored-doc')?.content !== undefined
            && JSON.stringify(backend.documents.get('stored-doc')?.content).includes('World'), 'the debounced store');

        assert.deepEqual(backend.documents.get('stored-doc')?.content, {
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'World' }] },
            ],
        });

        // Everyone leaves, so the server unloads the document from memory ...
        alice.provider.destroy();
        await waitFor(() => server.hocuspocus.getDocumentsCount() === 0, 'the document to unload');

        // ... and the next visitor gets it from the backend.
        const loadsBefore = backend.requests.filter((r) => r.method === 'GET' && r.path.endsWith('/stored-doc')).length;
        const carol = await connect('stored-doc', await mintToken({ doc: 'stored-doc', name: 'Carol', sub: '3' }));
        assert.deepEqual(paragraphs(carol.doc), ['Hello', 'World']);
        assert.equal(backend.requests.filter((r) => r.method === 'GET' && r.path.endsWith('/stored-doc')).length, loadsBefore + 1);
    });

    it('fetches a fresh token on every connect when given a function', async () => {
        let calls = 0;
        const client = await connect('token-fn-doc', async () => {
            calls++;
            return mintToken({ doc: 'token-fn-doc' });
        });

        assert.equal(calls, 1);
        assert.equal(client.scope, 'read-write');
    });

    it('lets a view-only token watch but not change the document', async () => {
        const alice = await connect('readonly-doc', await mintToken({ doc: 'readonly-doc' }));
        const viewer = await connect('readonly-doc', await mintToken({ doc: 'readonly-doc', mode: 'view', name: 'Viewer', sub: '9' }));

        assert.equal(viewer.scope, 'readonly');

        addParagraph(viewer.doc, 'should not arrive');
        addParagraph(alice.doc, 'from alice');

        await waitFor(() => paragraphs(viewer.doc).includes('from alice'), 'the viewer to receive Alice\'s edit');
        await new Promise((resolve) => setTimeout(resolve, 200));

        assert.deepEqual(paragraphs(alice.doc), ['from alice']);
    });

    it('rejects tokens that are forged, expired, missing or for another document', async () => {
        await assert.rejects(connect('collab-test', await mintToken({}, { secret: 'x'.repeat(40) })), /authentication failed/);
        await assert.rejects(connect('collab-test', await mintToken({}, { expiresIn: '-1m' })), /authentication failed/);
        await assert.rejects(connect('collab-test', await mintToken({ doc: 'exam-1' })), /authentication failed/);
        await assert.rejects(connect('collab-test', ''), /authentication failed/);

        assert.ok(warnings.some((w) => w.includes('issued for "exam-1"')));
        assert.equal(server.hocuspocus.getDocumentsCount(), 0);
    });

    it('puts the name from the token on the cursor, whatever the browser claims', async () => {
        const alice = await connect('awareness-doc', await mintToken({ doc: 'awareness-doc', name: 'Alice' }));
        const bob = await connect('awareness-doc', await mintToken({ doc: 'awareness-doc', name: 'Bob', sub: '2' }));

        alice.provider.setAwarenessField('user', { name: 'Not Alice', color: '#ff0000' });

        const aliceId = alice.doc.clientID;
        await waitFor(() => bob.provider.awareness?.getStates().get(aliceId)?.user !== undefined, 'Alice\'s cursor to reach Bob');

        assert.deepEqual(bob.provider.awareness?.getStates().get(aliceId)?.user, { name: 'Alice', color: '#ff0000' });

        alice.provider.setAwarenessField('user', { name: 'Alice', color: 'javascript:alert(1)' });
        await waitFor(() => bob.provider.awareness?.getStates().get(aliceId)?.user?.color !== '#ff0000', 'the new colour');
        assert.equal(bob.provider.awareness?.getStates().get(aliceId)?.user?.color, '#5c6b7a');
    });

    it('refuses to open a document it cannot load, and never stores an empty one over it', async () => {
        backend.failLoadsFor.add('broken-doc');
        let synced = false;

        const doc = new Y.Doc();
        const provider = new HocuspocusProvider({
            url: collabUrl,
            name: 'broken-doc',
            document: doc,
            token: await mintToken({ doc: 'broken-doc' }),
            onSynced: () => {
                synced = true;
            },
        });
        openProviders.push(provider);
        addParagraph(doc, 'typed while the backend is down');

        await new Promise((resolve) => setTimeout(resolve, 500));

        assert.equal(synced, false);
        assert.equal(backend.documents.has('broken-doc'), false);
        assert.equal(backend.requests.some((r) => r.method === 'PUT' && r.path.endsWith('/broken-doc')), false);
    });
    it('sends who changed the document, and the days, along with each store', async () => {
        const alice = await connect('contrib-doc', await mintToken({ doc: 'contrib-doc', sub: '11' }));
        const bob = await connect('contrib-doc', await mintToken({ doc: 'contrib-doc', name: 'Bob', sub: '12' }));
        await connect('contrib-doc', await mintToken({ doc: 'contrib-doc', mode: 'view', name: 'Viewer', sub: '13' }));

        addParagraph(alice.doc, 'from alice');
        addParagraph(bob.doc, 'from bob');
        const day = new Y.Map<string>();
        day.set('id', 'd1');
        day.set('label', 'ma 20 jan');
        alice.doc.getArray('sittings').push([day]);

        await waitFor(() => JSON.stringify(backend.documents.get('contrib-doc')?.fields ?? {}).includes('ma 20 jan')
            && backend.stores.filter((s) => s.name === 'contrib-doc').flatMap((s) => s.contributors).includes('12'),
            'a store with both editors and the day');

        const everyone = new Set(backend.stores.filter((s) => s.name === 'contrib-doc').flatMap((s) => s.contributors));
        assert.deepEqual([...everyone].sort(), ['11', '12']);
        assert.deepEqual(backend.documents.get('contrib-doc')?.fields, { sittings: [{ id: 'd1', label: 'ma 20 jan' }] });

        // Each store only lists the editors since the one before.
        const storesBefore = backend.stores.length;
        addParagraph(bob.doc, 'bob again');
        await waitFor(() => backend.stores.length > storesBefore, 'the next store');
        assert.deepEqual(backend.stores.at(-1)?.contributors, ['12']);
    });

    it('rolls a live document back when Symfony asks, for everyone who has it open', async () => {
        const alice = await connect('restore-doc', await mintToken({ doc: 'restore-doc' }));
        addParagraph(alice.doc, 'good question');
        const day = new Y.Map<string>();
        day.set('id', 'd1');
        day.set('label', 'ma 20 jan');
        alice.doc.getArray('sittings').push([day]);
        await waitFor(() => JSON.stringify(backend.documents.get('restore-doc')?.content ?? {}).includes('good question'), 'the store');
        const goodState = backend.documents.get('restore-doc')!.state;

        // Vandalised: content and days gone, something else in their place.
        const fragment = alice.doc.getXmlFragment(EDITOR_FIELD);
        fragment.delete(0, fragment.length);
        alice.doc.getArray('sittings').delete(0, 1);
        addParagraph(alice.doc, 'spam');
        const bob = await connect('restore-doc', await mintToken({ doc: 'restore-doc', name: 'Bob', sub: '2' }));
        assert.deepEqual(paragraphs(bob.doc), ['spam']);

        const response = await internalRequest('/internal/documents/restore-doc/restore', { state: goodState.toString('base64') });
        assert.equal(response.status, 204);

        await waitFor(() => paragraphs(bob.doc).join() === 'good question', 'Bob to see the restored content');
        assert.deepEqual(paragraphs(alice.doc), ['good question']);
        assert.deepEqual(bob.doc.getArray('sittings').toJSON(), [{ id: 'd1', label: 'ma 20 jan' }]);

        // And the result is stored like any edit.
        await waitFor(() => !JSON.stringify(backend.documents.get('restore-doc')?.content).includes('spam'), 'the store');
    });

    it('restores a document nobody has open by loading it first', async () => {
        const source = new Y.Doc();
        addParagraph(source, 'old version');
        const current = new Y.Doc();
        addParagraph(current, 'current version');
        backend.documents.set('closed-doc', {
            state: Buffer.from(Y.encodeStateAsUpdate(current)),
            content: null,
            fields: {},
            contributors: [],
        });

        const response = await internalRequest('/internal/documents/closed-doc/restore', {
            state: Buffer.from(Y.encodeStateAsUpdate(source)).toString('base64'),
        });
        assert.equal(response.status, 204);

        await waitFor(() => JSON.stringify(backend.documents.get('closed-doc')?.content ?? {}).includes('old version'), 'the store');
        const reloaded = new Y.Doc();
        Y.applyUpdate(reloaded, backend.documents.get('closed-doc')!.state);
        assert.deepEqual(paragraphs(reloaded), ['old version']);
    });

    it('refuses internal requests that are unsigned, malformed or unknown', async () => {
        const unsigned = await fetch(`http://127.0.0.1:${server.address.port}/internal/documents/x/disconnect`, { method: 'POST' });
        assert.equal(unsigned.status, 401);

        const forged = await internalRequest('/internal/documents/x/disconnect', '', 'y'.repeat(40));
        assert.equal(forged.status, 401);

        assert.equal((await internalRequest('/internal/documents/x/restore', { state: '' })).status, 400);
        assert.equal((await internalRequest('/internal/documents/x/restore', 'not json')).status, 400);
        // Not a Yjs update: fails before anything is touched.
        const garbage = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f]).toString('base64');
        assert.equal((await internalRequest('/internal/documents/garbage-doc/restore', { state: garbage })).status, 500);
        assert.equal((await internalRequest('/internal/documents/Bad_Name/disconnect', '')).status, 404);
        assert.equal((await internalRequest('/internal/documents/x/explode', '')).status, 404);
        assert.equal(backend.documents.has('garbage-doc'), false);
    });

    it('reconnects everyone when Symfony asks, so a lock takes effect at once', async () => {
        let mode: 'edit' | 'view' = 'edit';
        let tokens = 0;
        const client = await connect('lock-doc', async () => {
            tokens++;
            return mintToken({ doc: 'lock-doc', mode });
        });
        assert.equal(client.scope, 'read-write');

        mode = 'view';
        const response = await internalRequest('/internal/documents/lock-doc/disconnect', '');
        assert.equal(response.status, 204);

        await waitFor(() => tokens === 2 && client.provider.isAuthenticated, 'the client to reconnect with a new token', 5000);
        assert.equal(client.provider.authorizedScope, 'readonly');
        addParagraph(client.doc, 'typed after the lock');
        await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(JSON.stringify(backend.documents.get('lock-doc')?.content ?? {}).includes('after the lock'), false);
    });

    it('stops a connection from editing once its document locks, even if it was opened before', async () => {
        let tokens = 0;
        const until = Math.floor(Date.now() / 1000) + 60;
        const client = await connect('until-doc', async () => {
            tokens++;
            return mintToken({ doc: 'until-doc', until, mode: tokens === 1 ? 'edit' : 'view' });
        });

        addParagraph(client.doc, 'before the lock');
        await waitFor(() => JSON.stringify(backend.documents.get('until-doc')?.content ?? {}).includes('before the lock'), 'the store');

        clockOffset = 120_000;
        addParagraph(client.doc, 'after the lock');

        await waitFor(() => tokens === 2 && client.provider.isAuthenticated, 'the client to come back for a new token', 5000);
        assert.equal(client.provider.authorizedScope, 'readonly');
        await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(JSON.stringify(backend.documents.get('until-doc')?.content).includes('after the lock'), false);
    });

    it('closes editing on a document that grew too large, says why, and reopens it once rolled back', async () => {
        let tokens = 0;
        const client = await connect('big-doc', async () => {
            tokens++;
            return mintToken({ doc: 'big-doc' });
        });
        const notices: string[] = [];
        client.provider.on('stateless', ({ payload }: { payload: string }) => notices.push(payload));

        addParagraph(client.doc, 'a normal question');
        await waitFor(() => JSON.stringify(backend.documents.get('big-doc')?.content ?? {}).includes('a normal question'), 'the store');
        const beforePaste = Buffer.from(backend.documents.get('big-doc')!.state);

        addParagraph(client.doc, 'x'.repeat(30_000));
        await waitFor(() => tokens === 2 && client.provider.isAuthenticated, 'the client to reconnect', 5000);
        assert.equal(client.provider.authorizedScope, 'readonly');
        await waitFor(() => notices.includes(TOO_LARGE_MESSAGE), 'the notice');
        assert.ok(warnings.some((warning) => warning.includes('"big-doc" grew to')));

        // Someone opening it now is read-only from the start.
        const latecomer = await connect('big-doc', await mintToken({ doc: 'big-doc', sub: '2' }));
        assert.equal(latecomer.provider.authorizedScope, 'readonly');

        // A moderator rolls it back to before the paste: editing opens again for everyone.
        const response = await internalRequest('/internal/documents/big-doc/restore', { state: beforePaste.toString('base64') });
        assert.equal(response.status, 204);
        await waitFor(
            () => tokens === 3 && client.provider.isAuthenticated && client.provider.authorizedScope === 'read-write',
            'editing to reopen',
            5000,
        );
    });
});
