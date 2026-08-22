# AGENTS.md

This file provides guidance to coding agents when working with
code in this repository. `CLAUDE.md` imports this file, so edit this one; the two never drift.

## Layout

Monorepo with two independent apps: `backend/` (Symfony 8 + API Platform 4, PHP 8.4) and `frontend/`
(Next.js 16 App Router, React 19, TypeScript). Postgres 18. Local development runs in Docker Compose,
optionally through VS Code Dev Containers.

## Commands

Makefile targets run from the repo root and wrap `docker compose exec`. Inside a dev container, run the
underlying command instead (`vendor/bin/phpunit`, not `make phpunit`).

| Task | Command |
| --- | --- |
| Start / stop | `make up` / `make down` (`make clean` also drops volumes) |
| Database setup | `make db` — migrate, load fixtures, generate JWT keypair |
| Backend tests | `make phpunit` |
| Static analysis | `make phpstan` (level 5, over `src` and `tests`) |
| PHP code style | `make phpcs` / `make phpcbf` to autofix |
| Admin user | `make admin`, `make reset-password` |
| Shells | `make backend-shell`, `make frontend-shell` |

A single backend test or file:

```bash
docker compose exec backend vendor/bin/phpunit --filter testGetCollectionOfPrograms
docker compose exec backend vendor/bin/phpunit tests/Api/ProgramResourceTest.php
```

Frontend, from `frontend/`: `npm run dev`, `npm run build`, `npm run lint`, `npm run lint:fix`.
There is no frontend test runner — lint and build are the only automated frontend checks, and both gate CI.

Schema changes: generate migrations with `php bin/console doctrine:migrations:diff` and edit the generated
file; never hand-write one from scratch.

**Ports**: frontend `3002`, backend `8000`, db `5432`. The frontend deliberately avoids 3000 — locally that
port belongs to the VTK website, which is the SSO issuer the login flow redirects to.

## Backend architecture

The central idea: **API resources are DTOs, deliberately separate from Doctrine entities.**

- `src/Entity/` — Doctrine entities (persistence model)
- `src/ApiResource/*Api.php` — API Platform resources (wire model; this is what clients see)
- `src/Mapper/*EntityToApiMapper.php` / `*ApiToEntityMapper.php` — MicroMapper mappers between the two
- `src/State/EntityClassDtoStateProvider` and `EntityClassDtoStateProcessor` — generic provider/processor
  wired onto nearly every resource via `stateOptions: new Options(entityClass: X::class)`

So adding or renaming one exposed field usually touches four files: the entity, the `*Api` resource, both
mappers, and often `SerializationGroups`.

Two constant classes drive output shape, and reading them first saves a lot of guessing:

- `App\Constants\SerializationGroups` — serializer groups; every exposed property lists the groups it appears in
- `App\Constants\MappingContext` — mappers branch on these. `SUMMARY` yields shallow rows for collections,
  `CURRICULUM_TREE` yields the nested program→module→course tree. Collection endpoints intentionally return
  far less than item endpoints.

`?pagination=false` returns a plain array rather than a Hydra paginator (handled in `EntityClassDtoStateProvider`).

Other subsystems:

- **Admin**: EasyAdmin 5 at `/admin`, `src/Controller/Admin/*CrudController.php`
- **Auth**: JWT (Lexik) plus refresh tokens on the `^/api` firewall; VTK "Fluxus" OAuth SSO through
  `src/Security/FluxusAuthenticator` and `src/OauthProvider/`. `FluxusRoleSynchronizer` maps SSO roles onto users.
  JWTs carry stored roles, not hierarchy-expanded ones — `ROLE_ADMIN` does not imply `ROLE_MODERATOR` in a token.
- **KU Leuven course import**: `src/Service/Onderwijsaanbod/`, driven by `ImportOnderwijsaanbodCommand` or the
  admin `OnderwijsaanbodImportController`

Tests: Zenstruck Foundry factories live in `src/Factory/` (not under `tests/`). API tests extend
`tests/Api/ApiTestCase`, whose `setUp()` creates a user and logs in to obtain `$this->token`; requests use
Zenstruck Browser. DAMA rolls the database back between tests.

## Frontend architecture

- **All backend calls funnel through `actions/api.tsx`** (`ApiClient`, a `'use server'` action). It attaches the
  JWT from the HTTP-only cookie, attempts refresh, and redirects to login on 401. Client components reach it via
  `hooks/useApi.tsx`, which layers on loading/error state and Sentry capture.
- **Hydra JSON is never consumed raw.** `utils/convertToEntity.ts` converts API payloads into the types in
  `types/entities.ts`; use those converters rather than indexing into responses.
- **`src/proxy.ts`** is Next 16's renamed middleware and does double duty: i18n routing *and* auth gating. It
  fetches the list of public pages from the backend, so which routes are public is data, not code.
- **i18n**: next-i18n-router + i18next. Default locale is `nl`, and the default locale has **no URL prefix** —
  `/courses` is Dutch, `/en/courses` is English; `/nl/...` redirects. Strings live in
  `src/translations/{nl,en}.json`. Server components use `initTranslations(locale)` from `app/i18n.ts`
  (including inside `generateMetadata`); client components use `useTranslation()`.
- **Styling**: Tailwind v4 with CSS-first config — everything is in `app/globals.css`, there is no
  `tailwind.config.js`. A `vtk-*` component layer lives in that file; Tailwind utilities override those classes
  because `@layer utilities` comes after `@layer components`.

## Conventions

- PHP style is enforced and gates CI: PSR-12 via phpcs plus a forbidden-functions rule banning
  `dump`/`dd`/`var_dump`/`exit`/`die`. Run `make phpcbf` before pushing.
- `backend/config/reference.php` is auto-generated and excluded from phpcs — do not hand-edit it.
- A workflow posts an OpenAPI spec diff on any PR touching `backend/src/` or `backend/config/`, so wire-model
  changes are visible in review.
- `frontend/AGENTS.md` and `frontend/CLAUDE.md` are regenerated by `next dev` on every run. Leave them alone;
  deleting them just recreates an uncommitted change.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, optional `(scope)`, `!` for breaking).
  The opt-in hook at `.githooks/commit-msg` enforces this; install it with `./.githooks/install-hooks.sh`.
  Merge, revert and fixup messages are exempt.
