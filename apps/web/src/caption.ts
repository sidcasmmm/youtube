import type { ShortScript } from "@shorts/prompts";

/** Platform caption body (title + CTA + hashtags). */
export function buildCaptionText(script: ShortScript): string {
  const tags = (script.captionHashtags ?? [])
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");
  return [script.title, script.cta, tags].join("\n\n");
}

export function buildHashtagsOnly(script: ShortScript): string {
  return (script.captionHashtags ?? [])
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");
}
