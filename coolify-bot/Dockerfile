FROM node:20-alpine

WORKDIR /app

# Copy package.json terlebih dahulu
COPY package.json ./

# Install dependencies
RUN npm install --production && npm cache clean --force

# Copy semua source files
COPY server.js ./

EXPOSE 4000

CMD ["node", "server.js"]
