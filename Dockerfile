FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for compiling native packages
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package configurations
COPY package*.json ./

# Install dependencies (ignoring scripts during install to avoid triggering local DB scripts)
RUN npm ci --ignore-scripts

# Copy application source code
COPY . .

# Grant execute rights to the entrypoint script
RUN chmod +x scripts/docker-entrypoint.sh

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["scripts/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
