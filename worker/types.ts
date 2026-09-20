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
  /** Set with `wrangler secret put OPENAI_API_KEY`; never in the repo. */
  OPENAI_API_KEY: string;
  /** Model id, so swapping tiers is config rather than code. */
  OPENAI_MODEL?: string;
  /** Cloudflare rate-limiting binding. */
  CHAT_RATE_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> };
  /** Static asset binding, present when the Worker serves ./dist. */
  ASSETS?: { fetch(request: Request): Promise<Response> };
}
