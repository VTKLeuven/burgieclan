# The collab server (Hocuspocus) for production. Built from the collab/ directory:
#   docker build -f collab/.docker/production/Dockerfile collab
#
# Node runs the TypeScript sources directly (type stripping), so there is no build step and no
# TypeScript in the image; `npm run typecheck` in CI is what checks the types.
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

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
