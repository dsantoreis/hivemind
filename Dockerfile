# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend-next/package.json frontend-next/package-lock.json* ./
RUN npm install || true
COPY frontend-next .
RUN npm run build || true

FROM python:3.12-slim AS builder
WORKDIR /app
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --upgrade pip && pip wheel --wheel-dir /wheels .

FROM python:3.12-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/*
COPY --from=frontend-builder /frontend/.next /app/frontend/.next
COPY --from=frontend-builder /frontend/public /app/frontend/public
EXPOSE 8000
CMD ["uvicorn", "ai_agent_demo.main:app", "--host", "0.0.0.0", "--port", "8000"]
