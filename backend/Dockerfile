FROM python:3.11-slim

WORKDIR /app

# build-essential: insightface has no prebuilt wheel (esp. on ARM/Apple Silicon) and compiles a C++ extension
# libgl1/libglib2.0-0: needed by opencv/insightface at import time
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]