import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth/session";
import { matchCommand } from "@/lib/intent/matchCommand";
import { groqReply, systemPrompt, GROQ_MODEL } from "@/lib/llm/groq";

export const maxDuration = 30; // seconds — inside Hobby's cap, room for the LLM call

type Body = {
  text?: string;
  tone?: string;
  customTone?: string;
  history?: { who: "user" | "concierge"; text: string }[];
};

export async function POST(req: Request) {
  // §2's proxy is a first line of defence, not the only one: re-check here
  // rather than trusting that the request got this far.
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { text, tone = "Casual", customTone = "", history = [] } = (await req.json()) as Body;
  if (!text?.trim()) return Response.json({ error: "no text" }, { status: 400 });

  const match = matchCommand(text);

  // §11 — a real recogniser mis-hears. This is the graceful "try again",
  // kept distinct from the connection-lost state.
  if (!match || match.confidence < 0.4) {
    try {
      const reply = await groqReply([
        { role: "system", content: systemPrompt(tone, customTone) },
        ...history.slice(-6).map((t) => ({
          role: (t.who === "user" ? "user" : "assistant") as "user" | "assistant",
          content: t.text,
        })),
        { role: "user", content: text },
      ]);
      return Response.json({ reply, intent: "open", model: GROQ_MODEL });
    } catch (err) {
      return Response.json(
        {
          reply: "Sorry, I didn't catch a command in that — try rephrasing, or type it instead.",
          intent: "unknown",
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 200 },
      );
    }
  }

  // TODO: replace this switch with real calls into Mimico's backend (§11).
  // The copy below is the prototype's, so the loop reads true end to end.
  switch (match.intent) {
    case "set_tone": {
      const next = match.value ?? "Casual";
      return Response.json({
        reply: `Done — new replies use a ${next.toLowerCase()} tone from now on.`,
        intent: match.intent,
        tone: next,
      });
    }
    case "clone_voice":
      return Response.json({
        reply: "Started — I'll let you know the moment it's ready.",
        intent: match.intent,
        ack: "Clone job started",
      });
    case "clone_status":
      return Response.json({
        reply: "Your voice clone is ready. Video clone finishes in about four minutes.",
        intent: match.intent,
      });
    case "send_whatsapp":
      return Response.json({ reply: "Sent to your WhatsApp, just now.", intent: match.intent });
  }
}
