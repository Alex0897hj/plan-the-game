FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Generate Prisma client from schema
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy socket server
COPY socket-server.js ./

EXPOSE 3001

CMD ["node", "socket-server.js"]
