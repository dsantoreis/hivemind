from fastapi.testclient import TestClient
from python_app.main import app


def test_health() -> None:
    client = TestClient(app)
    r = client.get('/health')
    assert r.status_code == 200
    assert r.json()['stack'] == 'python-fastapi'


def test_run() -> None:
    client = TestClient(app)
    r = client.post('/run', json={'task': 'improve onboarding'})
    assert r.status_code == 200
    body = r.json()
    assert 'Plan:' in body['plan']
    assert 'Recommended approach' in body['result']
