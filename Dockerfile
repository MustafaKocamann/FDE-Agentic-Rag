FROM python:3.13-slim

WORKDIR /app

# Python çalışma zamanı optimizasyonları
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# PyTorch ve sentence-transformers bağımlılıkları için OpenMP (libgomp1)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Bağımlılıkları kopyala ve kur (Docker katman önbelleği için önce requirements)
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Kaynak kodları kopyala
COPY . .

# Gerekli çalışma klasörlerini oluştur
RUN mkdir -p uploads data/sample_kb

EXPOSE 8080

# Container başlatma komutu (Cloud Run / AWS / Docker uyumlu PORT desteği)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
