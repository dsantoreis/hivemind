---
title: Getting Started
---

## Prerequisites

- Python 3.12+
- Node 22+
- Docker (optional)

## Run backend

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e .[dev]
uvicorn ai_agent_demo.main:app --reload
```

## Run dashboard

```bash
cd frontend-next
npm install
npm run dev
```
