FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy project files
COPY backend/ backend/
COPY database/ database/
COPY ml/ ml/
COPY .env.example .env.example

# Set PYTHONPATH so imports work from repo root
ENV PYTHONPATH=/app

# Install dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt -r ml/requirements.txt

# Expose port (Render sets $PORT at runtime)
EXPOSE 8000

# Start Uvicorn — $PORT is injected by Render (default 8000 for local)
CMD ["sh", "-c", "uvicorn backend.wsgi:app --host 0.0.0.0 --port ${PORT:-8000}"]
