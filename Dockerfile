# Build stage
FROM node:current-alpine AS builder
WORKDIR '/app'

RUN apk add git

# Install dependencies
COPY ./package*.json ./
RUN npm ci
COPY . .

# Build NPM
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Production stage
FROM node:current-alpine
WORKDIR '/app'

# Copy only necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE ${PORT}

CMD ["node", "dist/app.js"]