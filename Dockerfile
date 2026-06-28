FROM node:22-bookworm-slim

# better-sqlite3 is a production dependency; ensure native builds can compile on slim images.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY scripts ./scripts
COPY data/daily-challenge-live.example.json ./data/daily-challenge-live.example.json

EXPOSE 8787

CMD ["npm", "run", "bot:daily"]
