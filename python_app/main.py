from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="ai-agent-demo", version="0.2.0")


class RunRequest(BaseModel):
    task: str = Field(min_length=3, description="Task goal with at least 3 chars")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "stack": "python-fastapi"}


@app.post("/run")
def run(req: RunRequest) -> dict[str, str]:
    plan = f"Plan: break task into planner/researcher/writer/reviewer for '{req.task}'"
    return {"plan": plan, "result": "Recommended approach with guardrails and measurable output."}
