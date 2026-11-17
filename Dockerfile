FROM node:22-bookworm-slim

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL=postgresql://requerimientos:requerimientos@127.0.0.1:5432/requerimientos
ENV DIRECT_URL=postgresql://requerimientos:requerimientos@127.0.0.1:5432/requerimientos
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && sh scripts/start.sh"]
