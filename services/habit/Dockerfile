FROM node:18-slim

WORKDIR /usr/src/app/services/habit

COPY services/habit/package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["node", "dist/index.js"]
