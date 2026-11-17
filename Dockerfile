FROM node:22-alpine

WORKDIR /app

# Install all dependencies (including Vite/Tailwind devDependencies) before setting NODE_ENV=production
COPY package*.json ./
RUN npm ci

# Copy application source and build static frontend into dist/
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
