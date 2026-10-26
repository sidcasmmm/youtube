import OpenAI from "openai";
import {
  SCRIPT_SYSTEM_PROMPT,
  ShortScriptSchema,
  buildScriptUserPrompt,
  type ShortScript,
} from "@shorts/prompts";

const MOCK_SCRIPT: ShortScript = {
  title: "One Weird Habit",
  hook: "Stop scrolling — this 20-second habit saves me an hour every morning.",
  beats: [
    {
      id: "hook",
      narration:
        "Stop scrolling — this 20-second habit saves me an hour every morning.",
      onScreenText: "20 seconds. One hour back.",
      visualHint: "teal gradient morning light",
      weight: 1.2,
    },
    {
      id: "beat-1",
      narration:
        "Before I open any app, I write three priorities on a sticky note.",
      onScreenText: "3 priorities. Paper only.",
      visualHint: "sticky note close-up",
      weight: 1,
    },
    {
      id: "beat-2",
      narration:
        "Then I put my phone in another room until the first priority is done.",
      onScreenText: "Phone leaves the room.",
      visualHint: "phone face-down",
      weight: 1,
    },
    {
      id: "cta",
      narration:
        "Try it tomorrow. Follow for more tiny systems that actually stick.",
      onScreenText: "Try it tomorrow → follow",
      visualHint: "bold CTA card",
      weight: 1,
    },
  ],
  cta: "Try it tomorrow. Follow for more tiny systems that actually stick.",
  captionHashtags: ["#shorts", "#productivity", "#habits"],
};

export async function buildScript(opts: {
  topic?: string;
  script?: string;
  mock?: boolean;
  apiKey?: string;
  model?: string;
}): Promise<ShortScript> {
  if (opts.mock) {
    return MOCK_SCRIPT;
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