FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY src ./src
RUN uv sync --locked --no-dev

ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER nobody
CMD ["sh", "-c", "exec uvicorn --factory kardashev_collector.main:build_app --host 0.0.0.0 --port ${PORT:-8080}"]
