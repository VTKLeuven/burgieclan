FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14
WORKDIR /app/frontend
COPY frontend/package*.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache bash git
RUN npm ci

CMD ["npm", "run", "dev"]