FROM node:20-alpine
WORKDIR '/app'

RUN apk add git

COPY ./package.json ./
RUN npm install --legacy-peer-deps
COPY . .

# keep alphabetically sorted
ARG CLONE_FACTORY_ADDRESS
ENV CLONE_FACTORY_ADDRESS=$CLONE_FACTORY_ADDRESS
ARG PORT
ENV PORT=$PORT
ARG WS_ETH_NODE_URL
ENV WS_ETH_NODE_URL=$WS_ETH_NODE_URL

EXPOSE $PORT

CMD npm run start