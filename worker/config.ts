/**
 * Endpoint defaults, used when the LLM_* vars are unset.
 *
 * Kept out of index.ts because workerd treats every named export of the entry
 * module as a handler and refuses to start if one is a plain value.
 */
export const DEFAULT_BASE_URL = "https://soclaas-api.comp.nus.edu.sg/v1";
// Matches wrangler.jsonc, which says why this model. Named explicitly rather
// than via SoCLaaS's "default" alias, which can be repointed at any time.
export const DEFAULT_MODEL = "qwen3.6:27b";
