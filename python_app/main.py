from fastapi import FastAPI
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="ai-agent-demo", version="0.2.0")


class RunRequest(BaseModel):
    task: str = Field(min_length=3, description="Task goal with at least 3 chars")

    @field_validator("task", mode="before")
    @classmethod
    def normalize_task(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip()
        return value


def worker_discovery(task: str) -> dict[str, str]:
    """Worker 1 (simulado): coleta sinais/contexto para a tarefa."""
    insight = f"Contexto-chave identificado para '{task}': objetivo, restrições e impacto esperado."
    return {"worker": "discovery", "output": insight}


def worker_delivery(task: str, discovery_output: str) -> dict[str, str]:
    """Worker 2 (simulado): transforma contexto em plano executável."""
    plan = (
        f"Plano de entrega para '{task}': "
        f"1) definir critério de sucesso, 2) executar MVP, 3) medir resultado. "
        f"Baseado em: {discovery_output}"
    )
    return {"worker": "delivery", "output": plan}


def coordinator_run(task: str) -> dict[str, object]:
    """Coordenador: orquestra dois workers simulados e consolida resposta."""
    discovery = worker_discovery(task)
    delivery = worker_delivery(task, discovery["output"])

    summary = (
        f"Orquestração concluída: {discovery['worker']} -> {delivery['worker']}. "
        "Resultado pronto para execução."
    )

    return {
        "coordinator": "main-coordinator",
        "workers": [discovery, delivery],
        "summary": summary,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "stack": "python-fastapi"}


@app.post("/run")
def run(req: RunRequest) -> dict[str, object]:
    orchestration = coordinator_run(req.task)
    return {
        "task": req.task,
        "orchestration": orchestration,
    }
