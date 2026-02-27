FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    tesseract-ocr tesseract-ocr-fra \
    && pip3 install --break-system-packages pymupdf pytesseract \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production
COPY . .

ENV MFC_DATA_DIR=/data
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
