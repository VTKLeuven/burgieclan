FROM node:24-alpine
WORKDIR /app/frontend
COPY frontend/package*.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache bash git
RUN npm ci

CMD ["npm", "run", "dev"]