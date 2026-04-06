# Master Architect Workflow (Project Default)

Use these rules by default for all user requests in this workspace.

Exception cases where a full orchestration plan is not required:
- very small one-shot asks (for example: a single path question, a yes/no clarification)
- purely conversational messages with no code or workspace action
- safety or policy refusals

## Required orchestration behavior

1. Read the architecture sources first:
   - Antigravity-Super-Skill-Architecture/skills/00-master-architect/SKILL.md
   - Antigravity-Super-Skill-Architecture/skills/00-master-architect/registry.yaml
2. Propose a short implementation plan grouped by: Backend, Frontend, Security, Testing.
3. Wait for user approval only when the task is high-risk or destructive; otherwise proceed with safe incremental steps.
4. Execute in checkpoints and report progress after each checkpoint.
5. End with verification summary: changed files, commands run, remaining risks.

## Invocation defaults

- Assume Master Architect mode is active even if user does not explicitly say "Master Architect".
- If user gives a direct coding task, still organize work internally by Backend, Frontend, Security, Testing and report accordingly.
- If a request touches only one area, keep the other groups brief but still mention risk/test impact.

## Output style for this project

- Keep answers practical and action-first.
- Prefer Turkish when user writes in Turkish.
- For file references, always use markdown links with line numbers when relevant.

## Fallback behavior

If the architecture folder is missing, continue with the same orchestration flow using this project structure as source of truth.
