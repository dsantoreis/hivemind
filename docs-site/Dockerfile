FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=4321
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4321
CMD ["npx", "astro", "preview", "--host", "0.0.0.0", "--port", "4321"]
