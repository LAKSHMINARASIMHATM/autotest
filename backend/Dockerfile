FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    HOME=/home/user

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create Hugging Face user (UID 1000)
RUN useradd -m -u 1000 user
WORKDIR $HOME/app

# Copy dependency definition
COPY pyproject.toml .

# Install dependencies (install app as editable or standard package)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e "."

# Copy application source code
COPY --chown=user:user . $HOME/app

# Ensure proper permission for user 1000
RUN chown -R user:user $HOME

USER user

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
