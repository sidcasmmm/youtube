import OpenAI from "openai";
import {
  SCRIPT_SYSTEM_PROMPT,
  ShortScriptSchema,
  buildScriptUserPrompt,
  type ShortScript,
} from "@shorts/prompts";

/** Default offline mock — Space explainer (Things explained niche) */
export const MOCK_SCRIPT: ShortScript = {
  title: "Why Space Is Silent",
  hook: "Space is completely silent — and it's not because nobody's talking.",
  beats: [
    {
      id: "hook",
      narration:
        "Space is completely silent — and it's not because nobody's talking.",
      onScreenText: "Space has no sound.",
      visualHint: "deep space stars",
      stockQuery: "deep space stars galaxy",
      weight: 1.2,
    },
    {
      id: "beat-1",
      narration:
        "Sound needs a medium — air or water — to push molecules into a wave your ears can hear.",
      onScreenText: "Sound needs a medium.",
      visualHint: "sound wave visualization",
      stockQuery: "sound wave water ripples",
      weight: 1.1,
    },
    {
      id: "beat-2",
      narration:
        "In the vacuum between stars, those molecules are almost gone — so the wave has nowhere to travel.",
      onScreenText: "Vacuum = no wave.",
      visualHint: "astronaut in void",
      stockQuery: "astronaut floating space",
      weight: 1,
    },
    {
      id: "cta",
      narration:
        "Movies add roar for drama. Reality is quiet. Follow for more things explained.",
      onScreenText: "Movies lie. Follow →",
      visualHint: "earth from orbit",
      stockQuery: "earth from space orbit",
      weight: 1,
    },
  ],
  cta: "Movies add roar for drama. Reality is quiet. Follow for more things explained.",
  captionHashtags: ["#thingsexplained", "#space", "#shorts", "#science"],
};

export const SAMPLE_TOPICS = [
  {
    id: "space-silent",
    topic: "Why is space completely silent?",
    niche: "Space" as const,
    mockScript: MOCK_SCRIPT,
  },
  {
    id: "biology-yawn",
    topic: "Why do we yawn when someone else yawns?",
    niche: "Biology" as const,
    mockScript: {
      title: "Contagious Yawns",
      hook: "Someone yawns next to you — and suddenly you yawn too. Why?",
      beats: [
        {
          id: "hook",
          narration:
            "Someone yawns next to you — and suddenly you yawn too. Why?",
          onScreenText: "Yawns are contagious.",
          visualHint: "person yawning",
          stockQuery: "person yawning close up",
          weight: 1.2,
        },
        {
          id: "beat-1",
          narration:
            "It isn't just tiredness. Your brain mirrors social cues — especially from people you feel close to.",
          onScreenText: "Your brain mirrors them.",
          visualHint: "human brain",
          stockQuery: "human brain anatomy model",
          weight: 1.1,
        },
        {
          id: "beat-2",
          narration:
            "Scientists link it to empathy circuits — the same systems that help you read faces and moods.",
          onScreenText: "Empathy circuits fire.",
          visualHint: "friends talking",
          stockQuery: "friends conversation smiling",
          weight: 1,
        },
        {
          id: "cta",
          narration:
            "You're not broken — you're wired for connection. Follow for more biology explained.",
          onScreenText: "Wired to connect → follow",
          visualHint: "neurons network",
          stockQuery: "neurons synapse microscope",
          weight: 1,
        },
      ],
      cta: "You're not broken — you're wired for connection. Follow for more biology explained.",
      captionHashtags: ["#thingsexplained", "#biology", "#shorts", "#science"],
    } satisfies ShortScript,
  },
  {
    id: "earth-sky-blue",
    topic: "Why is the sky blue?",
    niche: "Earth" as const,
    mockScript: {
      title: "Why the Sky Is Blue",
      hook: "The sky isn't blue paint — sunlight gets scrambled on the way down.",
      beats: [
        {
          id: "hook",
          narration:
            "The sky isn't blue paint — sunlight gets scrambled on the way down.",
          onScreenText: "Sunlight gets scrambled.",
          visualHint: "blue sky clouds",
          stockQuery: "clear blue sky clouds",
          weight: 1.2,
        },
        {
          id: "beat-1",
          narration:
            "Air molecules scatter short blue wavelengths more than red — called Rayleigh scattering.",
          onScreenText: "Blue scatters more.",
          visualHint: "sunlight atmosphere",
          stockQuery: "sun rays atmosphere sky",
          weight: 1.1,
        },
        {
          id: "beat-2",
          narration:
            "That scattered blue light rains toward your eyes from every direction in the daytime sky.",
          onScreenText: "Blue from every direction.",
          visualHint: "wide blue horizon",
          stockQuery: "blue sky horizon landscape",
          weight: 1,
        },
        {
          id: "cta",
          narration:
            "At sunset, the blue is scattered away — red wins. Follow for more Earth explained.",
          onScreenText: "Sunset = red wins →",
          visualHint: "orange sunset",
          stockQuery: "orange red sunset sky",
          weight: 1,
        },
      ],
      cta: "At sunset, the blue is scattered away — red wins. Follow for more Earth explained.",
      captionHashtags: ["#thingsexplained", "#earth", "#shorts", "#science"],
    } satisfies ShortScript,
  },
] as const;

export async function buildScript(opts: {
  topic?: string;
  script?: string;
  mock?: boolean;
  mockScript?: ShortScript;
  apiKey?: string;
  model?: string;
}): Promise<ShortScript> {
  if (opts.mock) {
    return opts.mockScript ?? MOCK_SCRIPT;
  }

  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required (or pass --mock for offline skeleton).",
    );
  }

  const client = new OpenAI({ apiKey });
  const model = opts.model ?? process.env.OPENAI_LLM_MODEL ?? "gpt-4.1-mini";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SCRIPT_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildScriptUserPrompt({
          topic: opts.topic,
          script: opts.script,
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("LLM returned empty script content");
  }

  return ShortScriptSchema.parse(JSON.parse(raw));
}
