FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5
WORKDIR /app/collab
COPY collab/package*.json ./

RUN npm ci

# Node runs the TypeScript sources directly (type stripping) and restarts on changes.
CMD ["npm", "run", "dev"]
