from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .models import ResearchRequest, WorkflowResult
from .orchestrator import run_research_workflow
from .storage import store

app = FastAPI(title="ai-agent-demo", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-agent-demo"}


@app.post("/v1/research/workflows", response_model=WorkflowResult)
def create_research_workflow(req: ResearchRequest) -> WorkflowResult:
    result = run_research_workflow(req)
    store.save(result)
    return result


@app.get("/v1/research/workflows/{workflow_id}", response_model=WorkflowResult)
def get_research_workflow(workflow_id: str) -> WorkflowResult:
    result = store.get(workflow_id)
    if not result:
        raise HTTPException(status_code=404, detail="workflow_not_found")
    return result
