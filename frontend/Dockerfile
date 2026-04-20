FROM node:22-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias si faltan (para mantener consistencia si cambia el .json desde Linux) y arrancar Vite accesible externamente
CMD ["sh", "-c", "npm install && npm run dev -- --host 0.0.0.0"]
