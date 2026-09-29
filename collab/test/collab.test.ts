import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, afterEach, before, describe, it } from 'node:test';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Server } from '@hocuspocus/server';
import { SignJWT } from 'jose';
import * as Y from 'yjs';
import { createBackend, HEADER_SIGNATURE, HEADER_TIMESTAMP, signRequest } from '../src/backend.ts';
import { createCollabServer, EDITOR_FIELD, type ConnectionContext } from '../src/server.ts';
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
}

interface FakeBackend {
    url: string;
    documents: Map<string, StoredDocument>;
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
            const payload = JSON.parse(body) as { state: string; content: unknown };
            documents.set(name, { state: Buffer.from(payload.state, 'base64'), content: payload.content });
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
}

/** Mints a token the way CollabTokenIssuer does. */
async function mintToken(claims: Partial<TokenClaims> = {}, options: { secret?: string; expiresIn?: string } = {}) {
    const { doc = 'collab-test', mode = 'edit', name = 'Alice', sub = '1' } = claims;

    return new SignJWT({ doc, mode, name })
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

// ---------------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------------

describe('collab server', () => {
    let backend: FakeBackend;
    let server: Server<ConnectionContext>;
    const warnings: string[] = [];

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
        });
        await server.listen();
        collabUrl = `ws://127.0.0.1:${server.address.port}`;
    });

    afterEach(() => {
        for (const provider of openProviders.splice(0)) {
            provider.destroy();
        }
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
});
