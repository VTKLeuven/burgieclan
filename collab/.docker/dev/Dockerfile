FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
WORKDIR /app/collab
COPY collab/package*.json ./

RUN npm ci

# Node runs the TypeScript sources directly (type stripping) and restarts on changes.
CMD ["npm", "run", "dev"]
