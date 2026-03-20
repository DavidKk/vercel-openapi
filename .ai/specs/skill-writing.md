# How to Write Agent-Ready Skill Docs (SKILL.md)

This repo uses Markdown skill documents to help both humans and LLM agents decide:
when to call an API, how to construct requests, how to interpret the response, and what to do on errors.

**Every** module skill document in this repo should include the **core sections** below (order may vary slightly if it improves readability, but do not omit them).

## Recommended writing order (do this in sequence)

1. **Title + scope**

   - Name the capability and the underlying API identity (module name + endpoint).
   - State the service boundary (e.g. “China only / reverse geocode”).
   - Omit a separate “Base URL” line when examples already use root-relative paths (e.g. `/api/geo`).
   - Optional (index metadata only): you may add YAML front matter at the very top for discovery metadata (author/version/tags/etc.).
     - The exported ZIP markdown will strip this YAML so it does **not** increase LLM context.
     - The index/manifest JSON can read metadata for routing/selection, but the Markdown body remains the only instruction content for the agent.

2. **Trigger / When to use + Do NOT use (most important)**

   - Describe user intents that should trigger the call.
   - **Reduce undertrigger:** generalize phrasing and acceptable input shapes (e.g. multiple coordinate formats, synonyms) when the API input is still the same.
   - **Reduce overtrigger:** one line stating **do not** call when user intent is **unrelated** to this capability (unrelated chat or other tools).
   - Describe cases that must NOT trigger the call (inputs already provided, wrong modality such as place-name-only when the API needs coordinates, unsupported region, missing required fields, etc.).

3. **Multi-turn / Missing parameters (required)**

   - Prefer **parse-then-ask**: try common patterns (separators, labels, locales) before concluding values are missing.
   - If required inputs are missing, ambiguous, or not parseable: **do not** call the API or guess.
   - State exactly what to ask the user (e.g. “two decimal numbers only”) so the model does not hallucinate parameters.

4. **Parameter contract (strong constraints)**

   - For every param: type, required/optional, and strict validation rules (ranges for numbers, acceptable enums, finite vs infinite).
   - Include a clear strategy for how to handle invalid input (e.g. “400 => do not retry; ask user to correct inputs”).

5. **Steps (explicit procedure; required)**

   - Numbered list; start with **step 0** when applicable: **conversation cache** — if the same normalized inputs were already resolved successfully in this conversation, reuse and skip the HTTP call (then jump to formatting/output).
   - Continue with: parse/validate inputs → call API → check HTTP status → extract fields → format user output (adapt to the module).
   - Goal: stable, DSL-like execution; avoid implicit “figure it out” behavior.

6. **Request contract**

   - Prefer GET for cacheable read-only APIs; describe why (same params => same URL => cache hit).
   - Provide the exact URL format for GET and the exact JSON body schema for POST (if supported).

7. **Response semantics**

   - Mention the response envelope if applicable (commonly `{ code, message, data }`).
   - Explain which fields may be empty and why (empty fields = not applicable, not an error).
   - Document any “optional but possible” fields the API can return and how the agent should treat them.

8. **Output guidance (LLM-friendly format)**

   - Instruct the agent to return a simplified, human-readable summary in a stable format.
   - Provide 1 short example mapping response fields => summary text.
   - **Output language (when relevant):** e.g. keep **domain strings** (API-returned names/codes) as returned; use the **user’s language** for explanations, errors, and follow-up prompts when the user is not writing in the primary locale.

9. **Idempotency & cache / conversation reuse (required)**

   - State explicitly: **do not** repeat identical API calls for the same parameters in one conversation unless the user changes inputs or a prior attempt failed without a usable result.
   - State: **reuse** previous successful results when the user re-asks about the same inputs.

10. **Examples (few-shot; required)**

    - Add **at least two** happy-path lines: user message (or minimal input) → expected style of agent answer.
    - Add **at least one** “do not call API” (negative) example when confusion is likely — teaches **when not to use** the tool.
    - Improves trigger recognition and output shape; if answers depend on live API data, add “verify with API response” (or equivalent).

11. **Agent behavior rules (global)**

    - Prefer GET where applicable; follow **Steps**; keep outputs concise and aligned with **Output guidance**.

12. **Error handling & retry strategy (status-code specific)**
    - For each relevant HTTP status: what the agent should say and whether to retry.
    - Typical patterns:
      - `400`: invalid inputs => do not retry, ask user for corrected values.
      - `404`: unsupported/out-of-scope => do not retry, explain limitation.
      - `5xx`: service-side issue => retry later or suggest “try again later”.

## Quick checklist (copy/paste; every SKILL must pass)

- [ ] When to use + Do NOT use
- [ ] Multi-turn / missing parameters (no guess; what to ask)
- [ ] Parameter contract (types, ranges, validation)
- [ ] **Steps** (step 0: conversation cache when applicable; then validate → call → status → extract → format)
- [ ] Request (GET vs POST, paths/query/body)
- [ ] Response semantics (envelope, empty fields, optional fields)
- [ ] Output guidance (one stable format + output language policy if needed)
- [ ] **Idempotency & conversation reuse** (no duplicate calls; reuse prior success)
- [ ] **Examples** (≥2 happy path + ≥1 do-not-call / negative where relevant)
- [ ] Error handling per HTTP status (retry or not)
