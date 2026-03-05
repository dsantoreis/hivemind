from __future__ import annotations

from threading import Lock

from .models import WorkflowResult


class WorkflowStore:
    def __init__(self) -> None:
        self._data: dict[str, WorkflowResult] = {}
        self._lock = Lock()

    def save(self, result: WorkflowResult) -> None:
        with self._lock:
            self._data[result.workflow_id] = result

    def get(self, workflow_id: str) -> WorkflowResult | None:
        with self._lock:
            return self._data.get(workflow_id)


store = WorkflowStore()
