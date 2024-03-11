FROM node:current-alpine
WORKDIR '/app'

RUN apk add git

COPY ./package.json ./
RUN npm install -g npm@latest
RUN npm install --legacy-peer-deps
COPY . .

# keep alphabetically sorted
ARG ADMIN_API_KEY
ENV ADMIN_API_KEY=$ADMIN_API_KEY
ARG CLONE_FACTORY_ADDRESS
ENV CLONE_FACTORY_ADDRESS=$CLONE_FACTORY_ADDRESS
ARG PORT
ENV PORT=$PORT
ARG ETH_NODE_URL
ENV ETH_NODE_URL=$ETH_NODE_URL

ENV FASTIFY_ADDRESS=0.0.0.0

EXPOSE ${PORT}

CMD npm run start