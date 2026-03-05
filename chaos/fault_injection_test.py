import random

from fastapi.testclient import TestClient

from ai_agent_demo.main import app


def test_fault_injection_simulation(monkeypatch):
    client = TestClient(app, raise_server_exceptions=False)

    def flaky_search(*args, **kwargs):
        if random.random() < 0.5:
            raise RuntimeError('simulated_search_failure')
        from ai_agent_demo.models import SearchHit
        return [SearchHit(title='ok', url='https://example.com', snippet='ok')]

    monkeypatch.setattr('ai_agent_demo.orchestrator.web_search', flaky_search)
    resp = client.post(
        '/v1/research/workflows',
        json={'query': 'chaos engineering'},
        headers={'x-api-key': 'dev-api-key'},
    )
    assert resp.status_code in (200, 500)
