export interface CorpusDoc {
  /** Stable identifier, e.g. "project:kart-telemetry". */
  id: string;
  /** Human title shown in a citation. */
  title: string;
  /** Route on the site this came from, or null if it isn't a page. */
  route: string | null;
  text: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Env {
  /**
   * Set with `wrangler secret put LLM_API_KEY`; never in the repo.
   * Named for the protocol, not the vendor: the endpoint speaks the OpenAI
   * chat-completions API but is NUS SoC's LLM service, not OpenAI.
   */
  LLM_API_KEY: string;
  /** API root, e.g. https://soclaas-api.comp.nus.edu.sg/v1 */
  LLM_BASE_URL?: string;
  /** Model id, so swapping models is config rather than code. */
  LLM_MODEL?: string;
  /**
   * Durable Object namespace backing the per-IP rate limiter.
   *
   * Cloudflare's own rate-limiting binding was tried first and did not
   * enforce on this account: it returned success on every call, well past the
   * configured window. This replaces it with a counter we control.
   */
  RATE_LIMITER?: {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(request: Request): Promise<Response> };
  };
  /** Static asset binding, present when the Worker serves ./dist. */
  ASSETS?: { fetch(request: Request): Promise<Response> };
}
