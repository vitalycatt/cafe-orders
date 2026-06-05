FROM node:20-slim

WORKDIR /app

# Install server dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts

# Install and build client
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Copy server code
COPY server/ ./server/

EXPOSE 3000

CMD ["node", "server/index.js"]
