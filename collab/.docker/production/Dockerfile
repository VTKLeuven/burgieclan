# The collab server (Hocuspocus) for production. Built from the collab/ directory:
#   docker build -f collab/.docker/production/Dockerfile collab
#
# Node runs the TypeScript sources directly (type stripping), so there is no build step and no
# TypeScript in the image; `npm run typecheck` in CI is what checks the types.
FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85

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
