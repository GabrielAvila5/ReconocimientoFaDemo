FROM node:22-slim

# Instalar openssl (requerido por Prisma en Linux)
RUN apt-get update -y && apt-get install -y openssl

# Establecer directorio de trabajo
WORKDIR /app

# El comando de inicio incluye npm install para asegurar regenerar binarios nativos 
# (como los de Prisma y otros paquetes) antes de ejecutar generate, db push y dev,
# permitiendo así el Hot Reload en volúmenes montados.
CMD ["sh", "-c", "npm install && npx prisma generate && npx prisma db push && npm run dev"]
