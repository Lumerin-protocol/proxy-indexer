FROM node:current-alpine
WORKDIR '/app'

RUN apk add git

COPY ./package.json ./
RUN npm install -g npm@latest
RUN npm install --legacy-peer-deps
COPY . .

# keep alphabetically sorted
ARG CLONE_FACTORY_ADDRESS
ENV CLONE_FACTORY_ADDRESS=$CLONE_FACTORY_ADDRESS
ARG PORT
ENV PORT=$PORT
ARG WS_ETH_NODE_URL
ENV WS_ETH_NODE_URL=$WS_ETH_NODE_URL

ENV FASTIFY_ADDRESS=0.0.0.0

EXPOSE 80
# EXPOSE $PORT

CMD npm run start