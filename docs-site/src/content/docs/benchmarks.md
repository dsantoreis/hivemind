---
title: Benchmarks & Resilience
---

Hivemind ships with repeatable load, chaos, and soak checks so performance claims stay verifiable.

## Latest benchmark snapshot

Environment:
- Machine: Apple Silicon M4
- Python: 3.12
- Runtime: uvicorn workers=2

| Scenario | Throughput | p95 latency | Error rate |
| --- | ---: | ---: | ---: |
| Steady load (300 rps, 10 min) | 287 req/s | 148 ms | 0.2% |
| Spike load (1000 rps, 2 min) | 812 req/s | 412 ms | 1.8% |
| Soak (150 rps, 60 min) | 149 req/s | 133 ms | 0.1% |

## Reproduce locally

```bash
BASE_URL=http://localhost:8000 API_KEY=dev-api-key k6 run load-tests/k6-workflows.js
pytest chaos/fault_injection_test.py -q
bash soak/soak_test.sh
```

## Pass criteria

- Coverage remains above 80%
- Error rate under 2% during spike tests
- No crash loops during 60-minute soak
- p95 stays below 500ms in sustained load profile

## CI integration

Quality and docs pipelines run on pull requests and pushes:

- `.github/workflows/ci.yml`
- `.github/workflows/docs.yml`

When opening a PR with performance-sensitive changes, include before/after benchmark output and note any latency or memory regressions.
