FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
WORKDIR /app/frontend
COPY frontend/package*.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache bash git
RUN npm ci

CMD ["npm", "run", "dev"]