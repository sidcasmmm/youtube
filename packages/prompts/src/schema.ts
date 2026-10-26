import { z } from "zod";

export const BeatSchema = z.object({
  id: z.string(),
  narration: z.string().min(1),
  onScreenText: z.string().min(1),
  /** Human visual note (composition / mood) */
  visualHint: z.string().optional(),
  /** Stock search query for Pexels/Pixabay (prefer concrete nouns) */
  stockQuery: z.string().optional(),
  /** Approximate weight for timing (relative); word count still preferred */
  weight: z.number().positive().default(1),
});

export const ShortScriptSchema = z.object({
  title: z.string().min(1),
  hook: z.string().min(1),
  beats: z.array(BeatSchema).min(2).max(8),
  cta: z.string().min(1),
  captionHashtags: z.array(z.string()).default([]),
});

export type Beat = z.infer<typeof BeatSchema>;
export type ShortScript = z.infer<typeof ShortScriptSchema>;

export const SCRIPT_SYSTEM_PROMPT = `You turn a topic or draft script into a vertical Shorts voiceover plan for the niche "Things explained" (curiosity explainers about Space, Biology, and Earth).
Return ONLY valid JSON matching this shape:
{
  "title": string,
  "hook": string (spoken in first ~2 seconds),
  "beats": [
    {
      "id": string,
      "narration": string,
      "onScreenText": string (short, punchy, phone-readable),
      "visualHint": string,
      "stockQuery": string,
      "weight": number
    }
  ],
  "cta": string,
  "captionHashtags": string[]
}

Rules:
- Total spoken length should fit roughly 20–40 seconds when read aloud.
- 3–6 beats after the hook (include hook as beat 0 or fold hook into first beat narration).
- First beat must open with the hook energy — a surprising fact or question.
- Last beat should land the CTA (follow for more explainers).
- onScreenText: max ~8 words, high contrast caption style.
- stockQuery: 2–5 concrete visual keywords for stock B-roll (e.g. "milky way night sky", "human brain scan", "ocean waves aerial"). No abstract words like "concept".
- No music cues; VO-only.
- Hashtags: include niche tags like #thingsexplained #shorts plus topic tags.`;

export function buildScriptUserPrompt(input: {
  topic?: string;
  script?: string;
}): string {
  if (input.script?.trim()) {
    return `Polish and structure this draft into Shorts beats JSON for "Things explained":\n\n${input.script.trim()}`;
  }
  if (input.topic?.trim()) {
    return `Create a Shorts script from this "Things explained" topic (Space / Biology / Earth curiosity):\n\n${input.topic.trim()}`;
  }
  throw new Error("Provide --topic or --script");
}
