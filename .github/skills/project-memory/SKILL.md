---
name: project-memory
description: 'Global Memory System to maintain and manage shared project context.'
---
# Project Memory Skill

This skill acts as the system's "hippocampus," responsible for storing, retrieving, and updating long-term project contextual information.

## Purpose
To provide a single source of truth about project status, technical decisions, and global configurations, accessible to all authorized agents.

## Capabilities

### 1. `read_context`
Reads information from the global context.

*   **Input:**
    *   `key` (optional): The specific key to read (e.g., `tech_stack.languages`). If omitted, returns the entire context.
*   **Behavior:**
    1.  Loads `memory-store/global_context.yaml`.
    2.  If `key` is provided, navigates the object to find the value.
    3.  Returns the value or the entire object.

### 2. `update_context`
Updates or inserts information into the global context.

*   **Input:**
    *   `key`: The key to update (e.g., `active_phase.current`). Supports dot notation for nesting.
    *   `value`: The new value.
*   **Behavior:**
    1.  Loads `memory-store/global_context.yaml`.
    2.  Updates the value at the specified path.
    3.  Saves the file.
    4.  Returns confirmation.

### 3. `log_decision`
Logs an important decision or milestone in the project log.

*   **Input:**
    *   `title`: Title of the decision.
    *   `description`: Brief description.
    *   `status`: Status (e.g., `PROPOSED`, `ACCEPTED`, `DEPRECATED`).
    *   `adr_link` (optional): Link to the corresponding ADR file.
*   **Behavior:**
    1.  Loads `memory-store/global_context.yaml`.
    2.  Adds an entry to the `decisions_log` list with the current timestamp.
    3.  Saves the file.

## Usage (A2A)

### Tech Stack Query
```python
request = {
    "type": "QUERY",
    "target": "project-memory",
    "payload": {
        "action": "read_context",
        "key": "tech_stack"
    }
}
```

### Phase Update
```python
request = {
    "type": "TASK",
    "target": "project-memory",
    "payload": {
        "action": "update_context",
        "key": "active_phase.status",
        "value": "Completed"
    }
}
```

## File Structure
*   `memory-store/`: Data storage directory.
    *   `global_context.yaml`: Main context file.
*   `SKILL.md`: This file.

