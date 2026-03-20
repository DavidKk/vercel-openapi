/**
 * API skill document for agents: Prices module public endpoints + admin (Bearer) section.
 */
import PRICES_API_SKILL_PROTECTED_MD from './skill-protected.md?raw'
import PRICES_API_SKILL_PUBLIC_MD from './skill-public.md?raw'

export const PRICES_API_SKILL_PUBLIC = PRICES_API_SKILL_PUBLIC_MD

export const PRICES_API_SKILL_PROTECTED = PRICES_API_SKILL_PROTECTED_MD

/** @deprecated Use PRICES_API_SKILL_PUBLIC or UI-driven split; kept for imports expecting single export. */
export const PRICES_API_SKILL = PRICES_API_SKILL_PUBLIC
