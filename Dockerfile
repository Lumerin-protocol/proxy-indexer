# Build stage
FROM node:current-alpine AS builder
WORKDIR '/app'

RUN apk add git

COPY ./package*.json ./

RUN npm ci

COPY . .

# Build TypeScript
RUN npm run build

# Create production node_modules
RUN npm prune --production

# Production stage
FROM node:current-alpine
WORKDIR '/app'

# Copy only necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# keep alphabetically sorted
ARG ADMIN_API_KEY
ENV ADMIN_API_KEY=$ADMIN_API_KEY
ARG CLONE_FACTORY_ADDRESS
ENV CLONE_FACTORY_ADDRESS=$CLONE_FACTORY_ADDRESS
ARG ETH_NODE_URL
ENV ETH_NODE_URL=$ETH_NODE_URL
ARG FASTIFY_PLUGIN_TIMEOUT
ENV FASTIFY_PLUGIN_TIMEOUT=$FASTIFY_PLUGIN_TIMEOUT
ARG PORT
ENV PORT=$PORT

ENV FASTIFY_ADDRESS=0.0.0.0

EXPOSE ${PORT}

CMD node dist/app.js