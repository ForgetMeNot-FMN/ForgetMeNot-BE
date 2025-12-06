FROM node:19-alpine3.16

RUN npm install -g node-gyp
RUN npm install -g babel-cli

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8080
CMD ["npm", "run", "dev"]
