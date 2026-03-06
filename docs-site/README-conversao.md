# Conversão para Astro Starlight

Este diretório (`docs-site/`) usa **Astro + Starlight** para documentação estática.

## Estrutura

- `astro.config.mjs`: configuração principal do Starlight.
- `src/content/docs/`: conteúdo dos docs em Markdown/MDX.
- `k8s/`: manifests para deploy em Kubernetes.
- `Dockerfile`: build + runtime para servir docs em container.

## Fluxo de conversão (README legado -> docs)

1. Mover seções de `README.md` para páginas em `src/content/docs/`.
2. Criar páginas de referência em `src/content/docs/reference/`.
3. Registrar links no `sidebar` do `astro.config.mjs`.
4. Validar localmente:
   - `npm ci`
   - `npm run build`

## Publicação

### Docker

```bash
docker build -t hivemind-docs:latest .
docker run --rm -p 4321:4321 hivemind-docs:latest
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

Defina a variável `DOCS_HOST` no Ingress (`docs.example.com`) antes do apply em produção.
