FROM node:18-alpine

WORKDIR /app

# Add this for hot reloading in Docker
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

# Install dependencies
COPY package*.json ./
RUN npm ci

EXPOSE 3000

CMD ["npm", "run", "dev"]