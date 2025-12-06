FROM node:19-alpine3.16
RUN npm install node-gyp -g
RUN node-gyp install
RUN npm install -g babel-cli
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app/

COPY . .
WORKDIR /usr/src/app/services/service-template

RUN npm ci
CMD ["npm", "run", "dev"]
