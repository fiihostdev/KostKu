FROM node:20-alpine

# Install deps untuk Baileys (crypto, native modules)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

COPY package.json ./

# Install semua dependencies
RUN npm install

COPY server.js ./

# Direktori untuk menyimpan session WA (persisten via Coolify volume)
RUN mkdir -p /app/wa_auth

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production
ENV AUTH_DIR=/app/wa_auth

CMD ["node", "server.js"]
