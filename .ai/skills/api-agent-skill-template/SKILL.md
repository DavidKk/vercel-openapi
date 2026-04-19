---
name: api-agent-skill-template
description: Produces or updates agent-ready HTTP API skill markdown for this repo. Use when the user wants a new SKILL document for an API module, to fill the Skill tab / skill bundle content, or to align an existing skill with .ai/specs/skill-writing.md. Copy the embedded template, replace placeholders, verify the checklist, and mirror into app/<module>/skill-content.ts when applicable.
---

# API agent skill template (meta-skill)

This skill tells an AI **how** to write the human/agent-facing **API skill document** (Markdown) so it matches repo standards. The **authoritative rules** live in **`.ai/specs/skill-writing.md`**. A filled example: **`app/geo/skill.md`** / **`app/geo/skill-content.ts`** (ZIP entry name follows `moduleSkillMarkdownFilename('geo')` in `skills/index.ts`).

---

## When to use this skill

- User asks to add or rewrite **Skill** documentation for a public API module (`/api/<id>/...`).
- User wants an **agent-ready** doc (triggers, steps, errors, few-shot, conversation cache).
- User says “use the template” / “fill the skill doc” / “align with skill-writing”.

---

## Procedure (for the AI)

1. Read **`.ai/specs/skill-writing.md`** end-to-end.
2. Read the module’s **`.ai/specs/modules/<id>.md`** and **`app/api/<id>/route.ts`** (or nested routes) for real paths, methods, and response shape.
3. Copy the **Document body template** below (from `# {{TITLE}}` through **Agent rules**).
4. Replace every `{{...}}` placeholder with concrete content. **Do not delete sections**; if a section is N/A (e.g. no POST), write one line explaining why.
5. Prefer **root-relative paths** (e.g. `/api/foo`) in examples; use **`BASE_URL`** only if the project still expects `ApiSkillPanel` substitution — see `components/ApiSkillPanel.tsx`.
6. Optional YAML front matter may be added at the top for **index/manifest metadata only**; the build/export step strips it from downloaded `skills/*.md` so it does **not** increase LLM context.
7. If the module ships a downloadable skill string, update **`app/<id>/skill-content.ts`** to match the same Markdown (export const … = \`...\`).
8. Run through the **Completion checklist** at the bottom of this file; every box must pass.

---

## Document body template

**Instructions:** Copy everything inside the fence below into `app/<id>/skill.md` (or `skill-content.ts`; ZIP uses `moduleSkillMarkdownFilename('<id>')`). Replace all `{{PLACEHOLDERS}}`.

```markdown
# {{TITLE}} – {{ONE_LINE_SCOPE}}

## When to use

- {{TRIGGER_INTENTS_BULLETS}}
- {{INPUT_SHAPES_OR_SYNONYMS}} — reduce **undertrigger** (same API input, many phrasings / formats).
- **Do not** call when: {{DO_NOT_USE_BULLETS}} (wrong modality, already answered, out of scope).
- **Do not overuse:** **Do not** call when user intent is **unrelated** to {{CAPABILITY_SHORT}} (reduce **overtrigger**).

## Multi-turn / Missing parameters

- **Parse first:** {{PARSE_HINTS}} (separators, labels, locales, etc.).
- If required inputs are still missing or not parseable: **do not** call the API or guess; {{EXACT_FOLLOW_UP_PROMPT}}.

## Parameters

- {{PARAM_NAME}} ({{TYPE}}, {{REQUIRED_OR_OPTIONAL}}): {{CONSTRAINTS}}
- (repeat for each parameter)

## Steps

0. **Conversation cache:** If the same **normalized** inputs were already resolved successfully in this conversation, **reuse** that result and skip the HTTP call; jump to **step {{N_FORMAT}}** (format / output only).
1. **Parse and validate** inputs per **Parameters**; if invalid, **Multi-turn**.
2. **Call** {{HTTP_METHOD}} `{{API_PATH_WITH_PLACEHOLDERS}}` (prefer GET if cacheable). {{POST_FALLBACK_IF_ANY}}
3. **Check HTTP status** (and envelope if applicable): {{STATUS_MEANINGS_SHORT}}.
4. **Extract** from response: {{FIELDS_TO_USE}}.
5. **Format** user-facing output per **Output guidance** and **Output language**.

## Request

{{GET_LINE_OR_BLOCK}}
{{POST_LINE_OR_BLOCK_IF_ANY}}
{{CACHE_NOTE_IF_GET}}

## Response

{{ENVELOPE_DESCRIPTION}}
{{STATUS_TABLE_OR_BULLETS}}
{{EMPTY_FIELD_SEMANTICS}}
{{OPTIONAL_FIELDS_NOTE}}

## Say to the user (one line)

{{ONE_LINE_FORMAT_RULES}}

## Output language

{{OUTPUT_LANGUAGE_POLICY}} — e.g. keep API-returned names/codes as returned; use the user’s language for explanations, errors, and prompts when not in the primary locale.

## Idempotency & cache (conversation)

- **Step 0** is authoritative: no duplicate calls for the same normalized inputs in one conversation; reuse last successful payload.
- Call again only if {{RE_CALL_CONDITIONS}}.

## Examples

- User: {{HAPPY_INPUT_1}} → {{EXPECTED_STYLE_1}} ({{NOTE_IF_LIVE_DATA}})
- User: {{HAPPY_INPUT_2}} → {{EXPECTED_STYLE_2}} ({{NOTE_IF_LIVE_DATA}})
- User: {{NEGATIVE_INPUT}} → **Do not call this API** — {{WHY_AND_WHAT_TO_DO_INSTEAD}}

## Agent rules

{{SHORT_GLOBAL_RULES}}

## Error handling (HTTP)

- **{{STATUS_400}}:** {{ACTION_400}}
- **{{STATUS_404_OR_EQUIVALENT}}:** {{ACTION_404}}
- **{{STATUS_5XX}}:** {{ACTION_5XX}}
  (add rows for other statuses the API returns)
```

---

## Completion checklist (must pass before done)

Copy this list when handing off; every item must be satisfied.

- [ ] **When to use** + **Do NOT use** + **overuse** line (unrelated intent).
- [ ] **Undertrigger** coverage (formats / synonyms) where inputs can appear in multiple shapes.
- [ ] **Multi-turn** with **parse-then-ask** and a concrete follow-up prompt (no hallucinated params).
- [ ] **Parameters** — every param: type, required/optional, strict validation.
- [ ] **Steps** — includes **step 0** conversation cache when the API is repeatable per same inputs; ends with format/output.
- [ ] **Request** — GET vs POST, paths, query/body; cache note if GET is cacheable.
- [ ] **Response** — envelope, empty-field semantics, optional fields.
- [ ] **Output guidance** + **Output language** (if multilingual or mixed locale matters).
- [ ] **Idempotency** aligned with step 0.
- [ ] **Examples** — ≥2 happy path + ≥1 **do-not-call** negative (if confusion is plausible).
- [ ] **Error handling** per HTTP status (retry or not).
- [ ] **`app/<id>/skill-content.ts`** updated if the module exports bundled skill text (keep in sync with **`skills/index.ts`** paths).

---

## Reference

- Spec: `.ai/specs/skill-writing.md`
- Example: `app/geo/skill.md`, `app/geo/skill-content.ts`, `skills/index.ts` entry for `geo`
- Hydration-safe skill UI: `components/ApiSkillPanel.tsx`
