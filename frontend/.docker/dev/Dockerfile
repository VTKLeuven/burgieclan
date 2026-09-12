FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81
WORKDIR /app/frontend
COPY frontend/package*.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache bash git
RUN npm ci

CMD ["npm", "run", "dev"]