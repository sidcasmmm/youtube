#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import express from "express";
import { generateShort } from "@shorts/pipeline";
import { buildCaptionText, buildHashtagsOnly } from "./caption.js";
import {
  createJob,
  getJob,
  listJobs,
  publicJobView,
  pushProgress,
} from "./jobs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const publicDir = path.join(appRoot, "public");
const outputRoot = path.join(repoRoot, "output");
const docsDir = path.join(repoRoot, "docs");

loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const PORT = Number(process.env.PORT ?? 4173);

/** Only one generate at a time — Remotion + FFmpeg are heavy on a laptop. */
let generateBusy = false;

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, niche: "Things explained" });
});

/** Booleans only — never echo secret values. */
app.get("/api/env-status", (_req, res) => {
  res.json({
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    pexels: Boolean(process.env.PEXELS_API_KEY?.trim()),
    pixabay: Boolean(process.env.PIXABAY_API_KEY?.trim()),
    mockRecommended: !process.env.OPENAI_API_KEY?.trim(),
  });
});

app.get("/api/checklist", async (_req, res) => {
  try {
    const md = await readFile(
      path.join(docsDir, "manual-publish-checklist.md"),
      "utf8",
    );
    res.type("text/markdown").send(md);
  } catch {
    res.status(404).json({ error: "Checklist not found" });
  }
});

app.get("/api/jobs", (_req, res) => {
  res.json({ jobs: listJobs() });
});

app.get("/api/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(publicJobView(job));
});

app.get("/api/jobs/:id/events", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("snapshot", publicJobView(job));
  for (const p of job.progress) {
    send("progress", p);
  }
  if (job.status === "done") send("done", publicJobView(job));
  if (job.status === "error") send("error", { error: job.error });

  const onProgress = (p: unknown) => send("progress", p);
  const onDone = () => send("done", publicJobView(job));
  const onError = (err: unknown) => send("error", err);

  job.events.on("progress", onProgress);
  job.events.on("done", onDone);
  job.events.on("error", onError);

  req.on("close", () => {
    job.events.off("progress", onProgress);
    job.events.off("done", onDone);
    job.events.off("error", onError);
  });
});

app.get("/api/jobs/:id/caption", (req, res) => {
  const job = getJob(req.params.id);
  if (!job?.shortScript) {
    res.status(404).json({ error: "Caption not ready" });
    return;
  }
  res.json({
    title: job.shortScript.title,
    cta: job.shortScript.cta,
    hashtags: job.shortScript.captionHashtags,
    caption: buildCaptionText(job.shortScript),
    hashtagsOnly: buildHashtagsOnly(job.shortScript),
  });
});

app.get("/api/jobs/:id/download", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job?.result?.mp4Path) {
    res.status(404).json({ error: "MP4 not ready" });
    return;
  }
  const mp4Path = path.resolve(job.result.mp4Path);
  if (!mp4Path.startsWith(path.resolve(outputRoot) + path.sep)) {
    res.status(403).json({ error: "Invalid path" });
    return;
  }
  const titleSafe =
    (job.shortScript?.title ?? "short")
      .replace(/[^\w\-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "short";
  res.download(mp4Path, `${titleSafe}.mp4`);
});

app.post("/api/generate", async (req, res) => {
  if (generateBusy) {
    res.status(409).json({
      error: "A Short is already generating. Wait for it to finish, then try again.",
    });
    return;
  }

  const body = req.body ?? {};
  const topic =
    typeof body.topic === "string" ? body.topic.trim() : undefined;
  const script =
    typeof body.script === "string" ? body.script.trim() : undefined;
  const captionStyle =
    body.captionStyle === "minimal" || body.captionStyle === "explainer"
      ? body.captionStyle
      : "explainer";

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
  let mock = Boolean(body.mock);
  if (!hasOpenAI) {
    mock = true;
  }
  if (!topic && !script && !mock) {
    res.status(400).json({
      error: "Provide a topic or script (or enable mock mode).",
    });
    return;
  }

  const job = createJob({
    topic: topic || (mock ? "Why is space completely silent?" : undefined),
    scriptInput: script,
    mock,
    captionStyle,
  });

  res.status(202).json({ jobId: job.id, ...publicJobView(job) });

  generateBusy = true;
  job.status = "running";

  void (async () => {
    try {
      const result = await generateShort({
        topic: job.topic,
        script: job.scriptInput,
        mock: job.mock,
        captionStyle: job.captionStyle,
        outDir: outputRoot,
        runId: job.id.replace(/^job-/, ""),
        onProgress: (p) => pushProgress(job, p),
      });
      job.result = result;
      job.shortScript = result.script;
      job.status = "done";
      job.events.emit("done");
    } catch (err) {
      job.status = "error";
      job.error = err instanceof Error ? err.message : String(err);
      job.events.emit("error", { error: job.error });
    } finally {
      generateBusy = false;
    }
  })();
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Things explained — operator UI`);
  console.log(`  Open http://localhost:${PORT}`);
  console.log(
    `  Keys: OpenAI=${Boolean(process.env.OPENAI_API_KEY?.trim()) ? "yes" : "no (mock)"} Pexels=${Boolean(process.env.PEXELS_API_KEY?.trim()) ? "yes" : "no"}`,
  );
  console.log(`  Output: ${outputRoot}`);
});
