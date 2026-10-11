/**
 * Endpoint defaults, used when the LLM_* vars are unset.
 *
 * Kept out of index.ts because workerd treats every named export of the entry
 * module as a handler and refuses to start if one is a plain value.
 */
export const DEFAULT_BASE_URL = "https://soclaas-api.comp.nus.edu.sg/v1";
// Not SoCLaaS's "default" alias: that points at an agentic-coding model and
// costs ~4x more per question for a task that is grounded restatement.
export const DEFAULT_MODEL = "gemma4:26b";
