# Use Python 3.9 official image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PORT=8000
ENV PYTHONPATH=/app

# Expose port
EXPOSE $PORT

# Start command
CMD cd llm_stuff && python search_api.py