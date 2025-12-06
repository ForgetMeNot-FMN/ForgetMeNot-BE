FROM node:19-alpine3.16

RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY services/user/package*.json ./
RUN npm ci

COPY services/user .

RUN npm run build

CMD ["node", "dist/index.js"]
