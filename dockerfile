FROM node:20-alpine

WORKDIR /app

# ติดตั้ง dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate prisma client
RUN npx prisma generate

# Copy rest of the code
COPY . .

EXPOSE 4000

# ใช้ Command จาก docker-compose แทนเพื่อความยืดหยุ่นในการทำ Migration/Seed
CMD ["npm", "run", "dev"]