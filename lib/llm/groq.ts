/**
 * Groq chat completion. Chosen over a larger, slower host because a voice
 * agent lives or dies on time-to-first-word.
 *
 * Model: openai/gpt-oss-20b. Groq deprecated llama-3.3-70b-versatile and
 * llama-3.1-8b-instant for Free and Developer tiers on 2026-06-17 and points
 * migrations at the GPT-OSS pair; 20b is the lower-latency of the two, which
 * is the right trade for this loop. Override with GROQ_MODEL.
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function groqReply(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set.");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_completion_tokens: 160,
      temperature: 0.4,
    }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq returned ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const reply = json.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Groq returned no reply text.");
  return reply;
}

export function systemPrompt(tone: string, customTone: string): string {
  const voice =
    tone === "Professional"
      ? "Polished and precise. Ready to forward along as-is."
      : tone === "Custom" && customTone
        ? customTone
        : "Warm and relaxed, like a quick note to a friend.";

  return [
    "You are Mimico Concierge, a voice assistant for the Mimico.ai product.",
    "You are being spoken to out loud and your reply is read out loud.",
    `Tone: ${voice}`,
    "Rules: reply in at most two short sentences. No lists, no markdown, no emoji.",
    "You can help with: cloning a voice, setting the reply tone, checking clone status, and sending a clip to WhatsApp.",
    "If a request is outside those, say plainly that you can't do it yet.",
  ].join(" ");
}
