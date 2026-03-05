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


def test_run_rejects_too_short_task() -> None:
    client = TestClient(app)
    r = client.post('/run', json={'task': 'hi'})
    assert r.status_code == 422
    body = r.json()
    assert body['detail'][0]['type'] == 'string_too_short'


def test_run_trims_task_before_building_plan() -> None:
    client = TestClient(app)
    r = client.post('/run', json={'task': '   improve onboarding   '})
    assert r.status_code == 200
    assert "'improve onboarding'" in r.json()['plan']


def test_run_rejects_whitespace_only_task() -> None:
    client = TestClient(app)
    r = client.post('/run', json={'task': '   '})
    assert r.status_code == 422
    body = r.json()
    assert body['detail'][0]['type'] == 'string_too_short'
