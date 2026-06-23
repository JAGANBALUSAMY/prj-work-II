# Stage 1: Build React Application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source and compile project
COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy built files from stage 1
COPY --from=build /app/dist /usr/share/nginx/html
# Create entrypoint script for runtime environment variables
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-env-config.sh && \
    echo 'echo "window.RUNTIME_CONFIG = { VITE_API_URL: \"$VITE_API_URL\" };" > /usr/share/nginx/html/config.js' >> /docker-entrypoint.d/40-env-config.sh && \
    chmod +x /docker-entrypoint.d/40-env-config.sh

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
