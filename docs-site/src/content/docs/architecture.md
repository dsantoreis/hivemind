---
title: Architecture
---

```mermaid
flowchart LR
    UI[Next.js Dashboard] --> API[FastAPI Orchestrator]
    API --> Q[(Workflow Store)]
    API --> M[/Prometheus Metrics/]
    API --> T[/OTLP Trace Export/]
```

Core modules live in `src/ai_agent_demo` and are validated by API, integration, and security test suites.
