# collab

The live-editing server behind exam reconstructions: a small [Hocuspocus](https://tiptap.dev/docs/hocuspocus)
server that lets several people edit the same TipTap document at once.

```
browser ── TipTap + Collaboration ── websocket ──▶ collab (this app)
   │                                                ▲   │  load / store, HMAC-signed
   │                                   restore,     │   │  /internal/collab/documents/{name}
   │                                   disconnect   │   ▼
   └── POST /api/collab/token ──▶ backend (Symfony) ────┘
                                        │
                                       db  (collab_document, collab_document_revision, exam)
```

## How it fits together

1. The browser asks Symfony for a token: `POST /api/collab/token` with `{"document": "<name>"}`.
   Symfony decides access with `CollabDocumentVoter` and signs a JWT (HS256, `COLLAB_SECRET`)
   holding the user id, the document name, `edit` or `view`, and the name for the cursor.
   The frontend does this through a server action, so the login JWT never leaves its HTTP-only cookie.
2. The browser opens a websocket to this server with that token. `onAuthenticate` only checks
   the signature and that the token is for this document. A `view` token gives a read-only connection.
3. The first person to open a document makes this server load it from Symfony
   (`GET /internal/collab/documents/{name}`). If loading fails, the connection is refused rather than
   opening an empty document that would later be stored over the real one.
4. A moment after edits stop (`STORE_DEBOUNCE_MS`), at least every `STORE_MAX_DEBOUNCE_MS`, and when
   the last person leaves, the document goes back to Symfony (`PUT`): the Yjs state, which is the
   source of truth, plus a JSON copy for rendering and search (`content`: the editor as TipTap
   JSON; `fields`: the other shared types listed in `JSON_FIELDS`, like an exam's `sittings`)
   and the ids of the users who changed it since the previous store (`contributors`). Symfony
   keeps a revision at most every 10 minutes of editing (`CollabDocumentStore`).
5. Symfony calls back for the things it starts itself (`src/internal.ts`, signed the same way):
   - `POST /internal/documents/{name}/restore` with `{"state": "<base64>"}`: a moderator rolls
     back to a revision. The live content and `JSON_FIELDS` are replaced with clones of the old
     ones, as one normal edit that reaches everyone who has it open.
   - `POST /internal/documents/{name}/disconnect`: a moderator locked or reopened it. Every
     websocket on the document is closed, so browsers reconnect with a fresh token.

   A token can also say when its document locks (`until`): a connection opened before that stops
   editing once it passes, and is sent away to fetch a read-only token.
6. A document whose stored state grows past `MAX_DOCUMENT_BYTES` (2 MB, in `src/server.ts`) stops
   taking edits: everyone is reconnected read-only and gets a stateless `{"type": "too-large"}`
   message, which the exam page shows. Symfony refuses states over 5 MB, so without this a document
   past that would keep taking edits that are never stored. Rolling it back to a smaller version
   reopens it.

Two rules that are easy to break:

- **Never change a document by writing JSON into the database.** Connected clients would merge
  their own copy back in and text would duplicate. Changes to a live document (seeding, rollback)
  go through this server so they reach everyone as a normal edit.
- **The signature scheme exists twice**: `src/backend.ts` and
  `backend/src/Service/Collab/CollabRequestSignature.php`. Both tests share one test vector. It
  is used in both directions: this server signs its load/store calls, and checks Symfony's
  restore/disconnect calls the same way (`src/internal.ts`).
- **This server has no editor schema.** It copies the editor field and `JSON_FIELDS` as plain Yjs
  structures, and only the frontend knows what an `examQuestion` is
  (`frontend/src/components/exam`). A new top-level shared type that should be kept and rolled
  back goes into `JSON_FIELDS`.

## Running it

It starts with the rest of the stack (`make up`) and listens on `localhost:1234`.
Try it on any course page under "Examens" (start a reconstruction and open it in two browsers), or
at http://localhost:3002/collab-test (moderators only, local development only). Moderators see the
history, roll back, lock and reopen under "Exam reconstructions" in `/admin`.

```bash
make collab-shell   # shell in the container
make collab-test    # typecheck + integration tests
```

Node runs the TypeScript files directly (type stripping, Node ≥ 22.18), so there is no build step.
TypeScript only type-checks.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `COLLAB_SECRET` | – | Required, at least 32 bytes. Must equal the backend's `COLLAB_SECRET`. |
| `BACKEND_URL` | – | Required. How this server reaches Symfony, e.g. `http://backend:8000`. |
| `PORT` | `1234` | |
| `STORE_DEBOUNCE_MS` | `2000` | |
| `STORE_MAX_DEBOUNCE_MS` | `10000` | |

`GET /health` answers `{"status": "ok"}` for container health checks.

In production it runs as its own container (`collab/.docker/production/Dockerfile`, image
`ghcr.io/vtkleuven/burgieclan/collab`), behind nginx at `/collab`; nginx refuses `/collab/internal`.
The backend reaches it at `COLLAB_INTERNAL_URL` (default `http://collab:1234`).
