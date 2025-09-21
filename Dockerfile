# Use Python 3.11 official image
FROM python:3.11-slim

# Install system dependencies for building packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    gfortran \
    pkg-config \
    libopenblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .
# Ensure llm_stuff directory is copied
COPY llm_stuff/ ./llm_stuff/

# Set environment variables
ENV PORT=8000
ENV PYTHONPATH=/app

# Expose port
EXPOSE $PORT

# Start command
CMD ["python3", "llm_stuff/search_api.py"]