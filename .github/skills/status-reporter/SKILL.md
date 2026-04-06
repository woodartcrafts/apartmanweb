---
name: status-reporter
description: 'Generates automated reports on the status and health of the Skill Conglomerate.'
---
# Status Reporter Skill

This skill is responsible for gathering metrics and metadata from the entire system to generate a unified view of the project status.

## Purpose
To provide automated visibility into implementation progress, the number of active skills, and the current project phase by querying the "Global Memory" and the file structure.

## Capabilities

### 1. `generate_report`
Generates a `PROJECT_STATUS.md` file in the project root.

*   **Data Sources:**
    *   `project-memory`: To retrieve the current phase, version, and tech stack.
    *   `master-architect/registry.yaml`: To know the theoretical structure of the groups.
    *   `FileSystem`: To count physical skills in each directory.
*   **Output:** Generates/Updates `PROJECT_STATUS.md`.

## Usage (A2A)

```python
request = {
    "type": "TASK",
    "target": "status-reporter",
    "payload": {
        "action": "generate_report"
    }
}
```

## Scripts

### `scripts/generate_dashboard.py`
Python script that performs the gathering and generation logic. 
Can be executed manually or invoked by the orchestrator.

