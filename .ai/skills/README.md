# Skills under `.ai/skills/`

Cursor (and similar tools) load **SKILL.md** files here. Each folder is one skill.

| Skill                    | Path                                                                     | Purpose                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Module generator         | [module-generator/SKILL.md](./module-generator/SKILL.md)                 | Scaffold / extend feature modules; **must** update **`.ai/specs/modules-registry.yaml`** before new schema/generator; then **`pnpm run validate:ai`**. |
| API agent skill template | [api-agent-skill-template/SKILL.md](./api-agent-skill-template/SKILL.md) | **Template + instructions** to produce agent-ready HTTP API skill docs (copy → fill → checklist).                                                      |

**Normative spec** for what every API skill document must contain: [`.ai/specs/skill-writing.md`](../specs/skill-writing.md).

**Reference implementation** (filled example): bundled path `unbnd-geo-skill.md` (see `skills/index.ts`) and `app/geo/skill-content.ts`.

**Bundled / UI skills** (agent-ready body lives in `app/<module>/skill-content.ts`; ZIP bundles use `skills/index.ts`):  
`exchange-rate`, `fuel-price`, `geo`, `holiday`, `movies`, `dns`, `weather`, `finance` (TASI).  
**Skill tab only** (same pattern): `prices` (public + protected split), `proxy-rule`.

**Do not use this section as the canonical module list.** The source of truth for module ids is **`.ai/specs/modules-registry.yaml`**; this section only describes current skill packaging coverage.
