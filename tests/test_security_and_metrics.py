from fastapi.testclient import TestClient

from ai_agent_demo.main import app
from ai_agent_demo.rate_limit import rate_limiter

client = TestClient(app)


def test_token_issuance_and_metrics():
    token_resp = client.post("/auth/token", headers={"x-api-key": "dev-api-key"})
    assert token_resp.status_code == 200
    token = token_resp.json()["access_token"]

    metrics = client.get("/metrics")
    assert metrics.status_code == 200
    assert "ai_agent_demo_http_requests_total" in metrics.text

    list_resp = client.get("/v1/research/workflows", headers={"Authorization": f"Bearer {token}"})
    assert list_resp.status_code == 200


def test_rate_limit_guard(monkeypatch):
    monkeypatch.setattr(rate_limiter, "max_per_minute", 1)
    rate_limiter.reset()
    headers = {"x-api-key": "dev-api-key"}

    first = client.post(
        "/v1/research/workflows",
        json={"query": "fastapi observability"},
        headers=headers,
    )
    assert first.status_code in (200, 500)

    second = client.post(
        "/v1/research/workflows",
        json={"query": "fastapi observability"},
        headers=headers,
    )
    assert second.status_code == 429
