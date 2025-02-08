# Base stage with common setup
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage
FROM base AS dev
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true
RUN npm i
CMD ["npm", "run", "dev"]

# Test stage
FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "run", "test"]

# Production stage
FROM base AS prod
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]