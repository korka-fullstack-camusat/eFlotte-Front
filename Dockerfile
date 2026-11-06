FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5175

# Production par défaut (site construit, sans code source) ; FRONT_MODE=dev pour le rechargement à chaud
CMD ["sh", "deploy/demarrer.sh"]
