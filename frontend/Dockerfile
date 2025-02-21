FROM node:22-alpine
WORKDIR /app
COPY package*.json ./

RUN npm i
CMD ["npm", "run", "dev"]