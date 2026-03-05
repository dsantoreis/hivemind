from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Header
from fastapi.responses import StreamingResponse

from .config import settings
from .models import AuthTokenResponse, ResearchRequest, WorkflowResult
from .observability import WORKFLOW_COUNT, configure_logging, metrics_middleware, metrics_response, setup_otel
from .orchestrator import run_research_workflow
from .rate_limit import rate_limiter
from .security import mint_jwt, require_auth
from .storage import store

logger = logging.getLogger("ai_agent_demo")


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    if settings.otel_enabled:
        setup_otel()
    logger.info("startup")
    yield
    logger.info("shutdown_start")
    await asyncio.sleep(0.05)
    logger.info("shutdown_complete")


app = FastAPI(title="ai-agent-demo", version="2.0.0", lifespan=lifespan)
app.middleware("http")(metrics_middleware)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-agent-demo"}


@app.get("/metrics")
def metrics() -> object:
    return metrics_response()


@app.post("/auth/token", response_model=AuthTokenResponse)
def auth_token(x_api_key: str | None = Header(default=None)) -> AuthTokenResponse:
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="unauthorized")
    return AuthTokenResponse(access_token=mint_jwt(subject="dashboard-user"))


@app.post("/v1/research/workflows", response_model=WorkflowResult)
def create_research_workflow(
    req: ResearchRequest,
    request: Request,
    _: str = Depends(require_auth),
) -> WorkflowResult:
    client = request.client.host if request.client else "unknown"
    rate_limiter.check(client)
    result = run_research_workflow(req)
    store.save(result)
    WORKFLOW_COUNT.inc()
    logger.info("workflow_created", extra={"extra": {"workflow_id": result.workflow_id, "query": req.query}})
    return result


@app.get("/v1/research/workflows/{workflow_id}", response_model=WorkflowResult)
def get_research_workflow(workflow_id: str, _: str = Depends(require_auth)) -> WorkflowResult:
    result = store.get(workflow_id)
    if not result:
        raise HTTPException(status_code=404, detail="workflow_not_found")
    return result


@app.get("/v1/research/workflows", response_model=list[WorkflowResult])
def list_workflows(limit: int = 20, _: str = Depends(require_auth)) -> list[WorkflowResult]:
    return store.list_recent(limit=min(limit, 50))


@app.get("/v1/research/stream")
async def stream_workflows(_: str = Depends(require_auth)) -> StreamingResponse:
    async def event_gen():
        while True:
            payload = [item.model_dump(mode="json") for item in store.list_recent(10)]
            yield f"data: {payload}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(event_gen(), media_type="text/event-stream")
