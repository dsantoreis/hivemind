from fastapi.testclient import TestClient

from ai_agent_demo.main import app
from ai_agent_demo.models import SearchHit

client = TestClient(app)


def test_research_workflow_endpoint_and_retrieval(monkeypatch):
    def fake_search(query: str, max_results: int):
        return [
            SearchHit(
                title="FastAPI Docs",
                url="https://fastapi.tiangolo.com/",
                snippet="Modern Python APIs",
            )
        ]

    def fake_fetch(url: str, max_chars: int = 8000):
        return (
            "<h1>FastAPI</h1><p>FastAPI is high performance. "
            "It enables fast delivery for APIs.</p>"
        )

    monkeypatch.setattr("ai_agent_demo.orchestrator.web_search", fake_search)
    monkeypatch.setattr("ai_agent_demo.orchestrator.web_fetch", fake_fetch)

    create_resp = client.post(
        "/v1/research/workflows",
        json={"query": " fastapi performance ", "max_results": 1, "max_sources_to_read": 1},
    )
    assert create_resp.status_code == 200
    body = create_resp.json()
    assert body["query"] == "fastapi performance"
    assert "Research Brief" in body["final_report_markdown"]
    assert len(body["tool_calls"]) == 4

    workflow_id = body["workflow_id"]
    get_resp = client.get(f"/v1/research/workflows/{workflow_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["workflow_id"] == workflow_id


def test_not_found_workflow():
    resp = client.get("/v1/research/workflows/wf_unknown")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "workflow_not_found"


def test_validation_error_for_short_query():
    resp = client.post("/v1/research/workflows", json={"query": "abc"})
    assert resp.status_code == 422
