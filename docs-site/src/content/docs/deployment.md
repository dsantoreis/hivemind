---
title: Deployment
---

## Docker

```bash
docker build -t hivemind:latest .
docker compose up --build
```

## Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```
