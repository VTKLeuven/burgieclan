# The collab server (Hocuspocus) for production. Built from the collab/ directory:
#   docker build -f collab/.docker/production/Dockerfile collab
#
# Node runs the TypeScript sources directly (type stripping), so there is no build step and no
# TypeScript in the image; `npm run typecheck` in CI is what checks the types.
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

USER node
EXPOSE 1234

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:1234/health || exit 1

CMD ["node", "src/index.ts"]
