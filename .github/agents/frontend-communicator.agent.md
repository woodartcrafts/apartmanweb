---
name: "Frontend Communicator"
description: "Enlace A2A del Grupo Frontend. Gestiona la comunicación con otros grupos del Conglomerado."
tools: [read, search, agent]
user-invocable: false
---
# 🔗 Comunicador Frontend

Skill de comunicación del Grupo Frontend. Hereda del [Comunicador A2A Global](file:///d:/Users/julio/developer/Habilidades%20de%20Agentes/skills/99-common-utils/a2a-communicator/SKILL.md).

## Grupos de Comunicación Frecuente

| Grupo | Casos de Uso Típicos |
|-------|---------------------|
| Backend | Endpoints API, formatos de respuesta, contratos |
| Security | Manejo de tokens, autenticación cliente |
| DevOps | CDN, cache, deployment de estáticos |
| Testing | Tests E2E, visual regression |
| Marketing | SEO, analytics, tracking |

## Protocolo

```yaml
source_group: "20-frontend-group"
max_hops: 5
timeout_seconds: 30
```

