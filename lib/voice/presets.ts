"use client";

/**
 * The preview-voice catalogue.
 *
 * Built at runtime from the voices the device actually has, rather than
 * from a fixed list, because the set differs per OS and browser and a
 * hardcoded catalogue would offer voices that cannot speak.
 *
 * Deliberately not a library of real people. Cloning an identifiable
 * person without consent is the impersonation risk in this product; these
 * are the system's own licensed voices, crossed with tone presets to give
 * genuine range without it.
 */

export type TonePreset = {
  id: string;
  label: string;
  rate: number;
  pitch: number;
};

/** Each voice times these, which is where the breadth comes from. */
export const TONE_PRESETS: TonePreset[] = [
  { id: "natural", label: "Natural", rate: 1, pitch: 1 },
  { id: "warm", label: "Warm", rate: 0.92, pitch: 0.9 },
  { id: "bright", label: "Bright", rate: 1.08, pitch: 1.18 },
  { id: "deep", label: "Deep", rate: 0.88, pitch: 0.72 },
  { id: "measured", label: "Measured", rate: 0.78, pitch: 0.96 },
  { id: "quick", label: "Quick", rate: 1.28, pitch: 1.04 },
];

export type CatalogueVoice = {
  /** Stable id: the system voice plus the tone applied to it. */
  id: string;
  voiceURI: string;
  name: string;
  lang: string;
  region: string;
  tone: TonePreset;
};

const REGIONS: Record<string, string> = {
  "en-GB": "British",
  "en-US": "American",
  "en-AU": "Australian",
  "en-IN": "Indian",
  "en-IE": "Irish",
  "en-ZA": "South African",
  "en-NG": "Nigerian",
  "en-KE": "Kenyan",
  "en-CA": "Canadian",
  "en-NZ": "New Zealand",
  "en-SG": "Singaporean",
  "en-PH": "Filipino",
  "fr-FR": "French",
  "fr-CA": "French (Canada)",
  "de-DE": "German",
  "es-ES": "Spanish",
  "es-MX": "Spanish (Mexico)",
  "es-US": "Spanish (US)",
  "it-IT": "Italian",
  "pt-BR": "Portuguese (Brazil)",
  "pt-PT": "Portuguese",
  "nl-NL": "Dutch",
  "pl-PL": "Polish",
  "sv-SE": "Swedish",
  "da-DK": "Danish",
  "nb-NO": "Norwegian",
  "fi-FI": "Finnish",
  "tr-TR": "Turkish",
  "ru-RU": "Russian",
  "ar-SA": "Arabic",
  "hi-IN": "Hindi",
  "bn-IN": "Bengali",
  "ta-IN": "Tamil",
  "ur-PK": "Urdu",
  "sw-KE": "Swahili",
  "zh-CN": "Chinese (Mandarin)",
  "zh-HK": "Chinese (Cantonese)",
  "zh-TW": "Chinese (Taiwan)",
  "ja-JP": "Japanese",
  "ko-KR": "Korean",
  "th-TH": "Thai",
  "vi-VN": "Vietnamese",
  "id-ID": "Indonesian",
  "ms-MY": "Malay",
  "he-IL": "Hebrew",
  "el-GR": "Greek",
  "cs-CZ": "Czech",
  "hu-HU": "Hungarian",
  "ro-RO": "Romanian",
  "uk-UA": "Ukrainian",
};

export function regionFor(lang: string): string {
  const exact = REGIONS[lang];
  if (exact) return exact;
  const normalised = lang.replace("_", "-");
  const byExact = REGIONS[normalised];
  if (byExact) return byExact;
  // Fall back to the language subtag so an unmapped locale still groups.
  const base = normalised.split("-")[0];
  const firstMatch = Object.entries(REGIONS).find(([k]) => k.startsWith(`${base}-`));
  return firstMatch ? firstMatch[1].replace(/ \(.*\)$/, "") : normalised.toUpperCase();
}

/** Waits for the async voice list, which is empty on first call in Chrome. */
export async function loadSystemVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const synth = window.speechSynthesis;
  const have = synth.getVoices();
  if (have.length) return have;
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

export function buildCatalogue(voices: SpeechSynthesisVoice[]): CatalogueVoice[] {
  const out: CatalogueVoice[] = [];
  for (const v of voices) {
    for (const tone of TONE_PRESETS) {
      out.push({
        id: `${v.voiceURI}::${tone.id}`,
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        region: regionFor(v.lang),
        tone,
      });
    }
  }
  return out;
}

export function speakWithPreset(
  text: string,
  entry: CatalogueVoice,
  systemVoices: SpeechSynthesisVoice[],
  onEnd?: () => void,
): void {
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const match = systemVoices.find((v) => v.voiceURI === entry.voiceURI);
  if (match) utter.voice = match;
  utter.rate = entry.tone.rate;
  utter.pitch = entry.tone.pitch;
  if (onEnd) {
    utter.onend = onEnd;
    utter.onerror = onEnd;
  }
  synth.speak(utter);
}
