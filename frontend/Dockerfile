FROM node:18-alpine

WORKDIR /app

# Add this for hot reloading in Docker (can be removed in production)
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

# Install dependencies
COPY package*.json ./
RUN npm i       # Install dependencies (change to npm ci once stable production)

EXPOSE 3000

CMD ["npm", "run", "dev"]