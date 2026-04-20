FROM node:18-slim

# Instalar dependencias del sistema necesarias para face-api.js (canvas, etc.)
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de configuración de paquetes
COPY package*.json ./

# Instalar dependencias de la aplicación
RUN npm install

# Copiar configuración de TypeScript y Prisma
COPY tsconfig.json ./
COPY prisma ./prisma/

# Copiar código fuente
COPY src ./src/

# Construir la aplicación y generar el cliente Prisma
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
