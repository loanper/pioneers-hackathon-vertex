FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy application code
COPY . .

# Build the application
RUN pnpm build

# Command will be provided by smithery.yaml
CMD ["node", "dist/index.js"]
