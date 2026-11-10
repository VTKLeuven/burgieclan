FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216
WORKDIR /app/frontend
COPY frontend/package*.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache bash git
RUN npm ci

CMD ["npm", "run", "dev"]