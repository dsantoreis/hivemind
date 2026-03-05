from fastapi.testclient import TestClient
from python_app.main import app


def test_health() -> None:
    client = TestClient(app)
    r = client.get('/health')
    assert r.status_code == 200
    assert r.json()['stack'] == 'python-fastapi'


def test_run_orchestrates_two_simulated_workers() -> None:
    client = TestClient(app)
    r = client.post('/run', json={'task': 'improve onboarding'})
    assert r.status_code == 200

    body = r.json()
    assert body['task'] == 'improve onboarding'
    orchestration = body['orchestration']

    assert orchestration['coordinator'] == 'main-coordinator'
    assert len(orchestration['workers']) == 2
    assert orchestration['workers'][0]['worker'] == 'discovery'
    assert orchestration['workers'][1]['worker'] == 'delivery'
    assert 'Orquestração concluída' in orchestration['summary']


def test_run_rejects_too_short_task() -> None:
    client = TestClient(app)
    r = client.post('/run', json={'task': 'hi'})
    assert r.status_code == 422
    body = r.json()
    assert body['detail'][0]['type'] == 'string_too_short'


def test_run_trims_task_before_orchestrating() -> None:
    client = TestClient(app)
    r = client.post('/run', json={'task': '   improve onboarding   '})
    assert r.status_code == 200
    assert r.json()['task'] == 'improve onboarding'


def test_run_rejects_whitespace_only_task() -> None:
    client = TestClient(app)
    r = client.post('/run', json={'task': '   '})
    assert r.status_code == 422
    body = r.json()
    assert body['detail'][0]['type'] == 'string_too_short'
