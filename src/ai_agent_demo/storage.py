from __future__ import annotations

from threading import Lock

from .models import WorkflowResult


class WorkflowStore:
    def __init__(self) -> None:
        self._data: dict[str, WorkflowResult] = {}
        self._order: list[str] = []
        self._lock = Lock()

    def save(self, result: WorkflowResult) -> None:
        with self._lock:
            self._data[result.workflow_id] = result
            if result.workflow_id not in self._order:
                self._order.append(result.workflow_id)

    def get(self, workflow_id: str) -> WorkflowResult | None:
        with self._lock:
            return self._data.get(workflow_id)

    def list_recent(self, limit: int = 25) -> list[WorkflowResult]:
        with self._lock:
            ids = self._order[-limit:]
            return [self._data[i] for i in reversed(ids)]


store = WorkflowStore()
