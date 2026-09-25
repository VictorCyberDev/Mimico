import Fuse from "fuse.js";

/** §7 — a fixed command set, matched locally. No model call to route an intent. */
export type Intent = "clone_voice" | "set_tone" | "clone_status" | "send_whatsapp";

type Phrase = { intent: Intent; phrase: string };

const PHRASES: Phrase[] = [
  { intent: "clone_voice", phrase: "clone my voice" },
  { intent: "clone_voice", phrase: "clone my voice from this recording" },
  { intent: "clone_voice", phrase: "make a copy of my voice" },
  { intent: "clone_voice", phrase: "record my voice" },
  { intent: "set_tone", phrase: "set the tone to professional" },
  { intent: "set_tone", phrase: "set the tone to casual" },
  { intent: "set_tone", phrase: "change the tone" },
  { intent: "set_tone", phrase: "sound more professional" },
  { intent: "set_tone", phrase: "sound more casual" },
  { intent: "clone_status", phrase: "check my clone status" },
  { intent: "clone_status", phrase: "is my clone ready" },
  { intent: "clone_status", phrase: "how is my voice clone doing" },
  { intent: "send_whatsapp", phrase: "send the last clip to whatsapp" },
  { intent: "send_whatsapp", phrase: "send it to whatsapp" },
  { intent: "send_whatsapp", phrase: "share that on whatsapp" },
];

const fuse = new Fuse(PHRASES, {
  keys: ["phrase"],
  includeScore: true,
  threshold: 0.5,
  ignoreLocation: true,
});

export type Match = { intent: Intent; confidence: number; value?: string };

/** Pulls an explicit tone out of the utterance when there is one. */
function toneFrom(text: string): string | undefined {
  const t = text.toLowerCase();
  if (t.includes("professional")) return "Professional";
  if (t.includes("casual")) return "Casual";
  return undefined;
}

export function matchCommand(text: string): Match | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const [best] = fuse.search(trimmed, { limit: 1 });
  if (!best || best.score === undefined) return null;

  // fuse.js scores 0 = perfect, 1 = no match; flip it into a confidence.
  const confidence = 1 - best.score;
  const intent = best.item.intent;

  return {
    intent,
    confidence,
    ...(intent === "set_tone" ? { value: toneFrom(trimmed) } : {}),
  };
}
