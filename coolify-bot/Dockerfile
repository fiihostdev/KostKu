FROM node:20-alpine

# Install dependencies untuk npm ci
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package.json saja dulu (untuk cache layer)
COPY package.json ./

# Install semua dependencies (termasuk devDeps untuk build safety)
RUN npm install

# Copy source code
COPY . .

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

# Gunakan dumb-init agar signal handling benar
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
