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

# Bağımlılıkları kopyala ve kur
COPY requirements.txt .

# 1. pip uyarısını sustur ve güncelle
# 2. PyTorch CPU sürümünü kurarak 5 GB'lık gereksiz NVIDIA CUDA paketlerini ve DigitalOcean disk aşımını engelle
# 3. Kalan gereksinimleri kur
RUN pip install --no-cache-dir --upgrade --root-user-action=ignore pip \
    && pip install --no-cache-dir --root-user-action=ignore torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir --root-user-action=ignore -r requirements.txt \
    && python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Kaynak kodları kopyala
COPY . .

# Gerekli çalışma klasörlerini oluştur
RUN mkdir -p uploads data/sample_kb

EXPOSE 8080

# Container başlatma komutu (Cloud Run / AWS / Docker uyumlu PORT desteği)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
