FROM node:20-alpine

# Install git + build deps yang diperlukan Baileys
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

COPY package.json ./

# Install dependencies
RUN npm install

COPY server.js ./

# Direktori untuk session WA (akan di-mount sebagai Coolify Volume)
RUN mkdir -p /app/wa_auth

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production
ENV AUTH_DIR=/app/wa_auth

CMD ["node", "server.js"]
