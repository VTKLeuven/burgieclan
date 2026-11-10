FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216
WORKDIR /app/collab
COPY collab/package*.json ./

RUN npm ci

# Node runs the TypeScript sources directly (type stripping) and restarts on changes.
CMD ["npm", "run", "dev"]
