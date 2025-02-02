FROM node:18-alpine

WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]