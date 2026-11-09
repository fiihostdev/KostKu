FROM node:20-alpine

WORKDIR /app

# Copy semua files dari coolify-bot directory
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source
COPY server.js ./

# Verify installation
RUN node -e "require('express'); require('node-cron'); require('@supabase/supabase-js'); console.log('All deps OK');"

EXPOSE 4000

CMD ["node", "server.js"]
