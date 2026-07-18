FROM python:3.13-slim

RUN pip install --no-cache-dir uv

WORKDIR /app

# Install deps first (better layer caching) — --frozen so the lock file
# (which pins bcrypt<4.1 for passlib compatibility) is respected exactly.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

COPY . .
RUN uv sync --frozen

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
