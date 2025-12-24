FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["node", "dist/index.js"]
