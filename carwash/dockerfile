# Build stage
FROM node:23.3.0-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL
ARG API_BASE_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

# Production stage
FROM node:23.3.0-alpine
WORKDIR /app

# Re-declare args and env for runtime
ARG NEXT_PUBLIC_API_BASE_URL
ARG API_BASE_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

RUN npm ci --only=production

CMD ["npm", "start"]
