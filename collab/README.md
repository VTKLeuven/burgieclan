# collab

The live-editing server behind exam reconstructions: a small [Hocuspocus](https://tiptap.dev/docs/hocuspocus)
server that lets several people edit the same TipTap document at once.

```
browser ── TipTap + Collaboration ── websocket ──▶ collab (this app)
   │                                                  │  load / store, HMAC-signed
   └── POST /api/collab/token ──▶ backend (Symfony) ◀─┘  /internal/collab/documents/{name}
                                        │
                                       db  (collab_document table)
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
   source of truth, plus a TipTap JSON copy for rendering and search.

Two rules that are easy to break:

- **Never change a document by writing JSON into the database.** Connected clients would merge
  their own copy back in and text would duplicate. Changes to a live document (seeding, rollback)
  go through this server so they reach everyone as a normal edit.
- **The signature scheme exists twice**: `src/backend.ts` and
  `backend/src/Service/Collab/CollabRequestSignature.php`. Both tests share one test vector.

## Running it

It starts with the rest of the stack (`make up`) and listens on `localhost:1234`.
Try it at http://localhost:3002/collab-test (moderators only, local development only) in two browsers.

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
