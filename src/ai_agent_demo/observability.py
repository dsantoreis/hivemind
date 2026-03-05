from __future__ import annotations

import json
import logging
import time
from contextlib import suppress

from fastapi import Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

REQUEST_COUNT = Counter("ai_agent_demo_http_requests_total", "Total requests", ["method", "path", "status"])
REQUEST_LATENCY = Histogram("ai_agent_demo_http_latency_seconds", "Request latency", ["method", "path"])
WORKFLOW_COUNT = Counter("ai_agent_demo_workflows_total", "Total workflows created")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "ts": int(record.created * 1000),
        }
        if hasattr(record, "extra"):
            payload.update(record.extra)
        return json.dumps(payload)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)


async def metrics_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    method = request.method
    path = request.url.path
    REQUEST_COUNT.labels(method=method, path=path, status=response.status_code).inc()
    REQUEST_LATENCY.labels(method=method, path=path).observe(elapsed)
    return response


def metrics_response() -> Response:
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)


def setup_otel(app_name: str = "ai-agent-demo") -> None:
    with suppress(Exception):
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

        provider = TracerProvider(resource=Resource.create({"service.name": app_name}))
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
        trace.set_tracer_provider(provider)
