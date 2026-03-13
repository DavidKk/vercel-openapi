---
name: ai
description: All project agent skills (e.g. module generation, scaffolding) live in .ai/skills; read the relevant SKILL there so every IDE and tool uses the same instructions. Use when the user asks to add a module, scaffold code, or run a workflow that has a skill under .ai/skills/.
---

# Skills: use .ai/skills (single source of truth)

**All project agent skills** are defined under **`.ai/skills/`** so any IDE or tool can use the same instructions. This file only points to that folder.

- **Module generation (scaffold / extend feature modules)**  
  Read and follow: **`.ai/skills/module-generator/SKILL.md`**  
  Use when adding a new module, scaffolding layout/pages, or implementing overview component, API route, MCP tools, or Playground.

- **Other skills**  
  Look under **`.ai/skills/<name>/SKILL.md`**. When adding a new skill, create `.ai/skills/<name>/SKILL.md` and add a line here if you want it discoverable. The canonical content always lives in `.ai/skills/`.
