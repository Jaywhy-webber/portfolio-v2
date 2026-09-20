/**
 * Worker entry point.
 *
 * Serves the built site from the ASSETS binding and adds one route,
 * POST /api/chat, which proxies to OpenAI with the site's own content as the
 * grounding corpus. The API key lives as a Worker secret and never reaches
 * the browser — that constraint is the whole reason this Worker exists.
 */
import { CORPUS } from "./corpus";
import { buildSystemPrompt, LIMITS, REFUSALS } from "./prompt";
import type { ChatMessage, Env } from "./types";

const DEFAULT_BASE_URL = "https://soclaas-api.comp.nus.edu.sg/v1";
// Not SoCLaaS's "default" alias: that points at an agentic-coding model and
// costs ~4x more per question for a task that is grounded restatement.
const DEFAULT_MODEL = "gemma4:26b";

/** Built once per isolate, not per request — it is ~22k tokens of string work. */
let cachedSystemPrompt: string | undefined;
function systemPrompt(): string {
  if (!cachedSystemPrompt) cachedSystemPrompt = buildSystemPrompt(CORPUS);
  return cachedSystemPrompt;
}

function textEvent(text: string): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`);
}

const DONE = new TextEncoder().encode("data: [DONE]\n\n");

function sseResponse(body: BodyInit): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-store",
      connection: "keep-alive",
    },
  });
}

/** A refusal the model never sees, delivered in the same shape as a real reply. */
function refuse(message: string): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(textEvent(message));
      controller.enqueue(DONE);
      controller.close();
    },
  });
  return sseResponse(stream);
}

interface ChatRequestBody {
  question?: unknown;
  history?: unknown;
}

function parseHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m as ChatMessage).role !== undefined &&
        ["user", "assistant"].includes((m as ChatMessage).role) &&
        typeof (m as ChatMessage).content === "string",
    )
    .slice(-LIMITS.maxHistoryTurns)
    .map((m) => ({ role: m.role, content: m.content.slice(0, LIMITS.maxQuestionChars) }));
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return new Response("Bad request", { status: 400 });
  if (question.length > LIMITS.maxQuestionChars) return refuse(REFUSALS.tooLong);

  // Per-IP limit. Absent in local dev, where the binding isn't configured.
  if (env.CHAT_RATE_LIMIT) {
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const { success } = await env.CHAT_RATE_LIMIT.limit({ key: ip });
    if (!success) return refuse(REFUSALS.rateLimited);
  }

  const messages = [
    { role: "system" as const, content: systemPrompt() },
    ...parseHistory(body.history),
    { role: "user" as const, content: question },
  ];

  let upstream: Response;
  try {
    const baseUrl = (env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.LLM_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.LLM_MODEL || DEFAULT_MODEL,
        messages,
        // Grounded restatement, not creative writing.
        temperature: 0,
        max_tokens: LIMITS.maxOutputTokens,
        stream: true,
      }),
    });
  } catch {
    return refuse(REFUSALS.upstreamFailed);
  }

  if (!upstream.ok || !upstream.body) {
    // Length only, never any part of the key: a wrong length is the tell for a
    // stale or truncated value, which is what a 401 here usually means.
    console.error(
      "llm error",
      upstream.status,
      await upstream.text().catch(() => ""),
      "keyLen=" + (env.LLM_API_KEY?.length ?? "undefined"),
      "base=" + (env.LLM_BASE_URL || DEFAULT_BASE_URL),
      "model=" + (env.LLM_MODEL || DEFAULT_MODEL),
    );
    return refuse(REFUSALS.upstreamFailed);
  }

  // Re-emit OpenAI's SSE as our own minimal {text} events, so the browser
  // never sees the upstream response shape and a malformed chunk can't
  // propagate.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const chunk = JSON.parse(payload);
            const text = chunk?.choices?.[0]?.delta?.content;
            if (text) await writer.write(textEvent(text));
          } catch {
            // A single unparseable chunk should not kill the stream.
          }
        }
      }
    } catch (error) {
      console.error("stream failed", error);
    } finally {
      await writer.write(DONE).catch(() => {});
      await writer.close().catch(() => {});
    }
  })();

  return sseResponse(readable);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      return handleChat(request, env);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
