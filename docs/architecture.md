# Architecture

## Multi-agent flow

1. **Planner Agent** receives objective (`query`).
2. **Research Agent** calls `web_search` (real HTTP search).
3. **Reader Agent** calls `web_fetch` (real HTTP page fetch).
4. **Parser Agent** extracts readable text and key points.
5. **Reporter Agent** consolidates findings into markdown with citations.

All tool calls are recorded in `tool_calls` for traceability.

## Why this design

- Real-world use case (research/report generation)
- Clear orchestration boundaries
- Deterministic testability via monkeypatching tools
- API output directly usable in portfolio demos and client POCs
