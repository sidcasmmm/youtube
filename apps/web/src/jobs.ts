import { EventEmitter } from "node:events";
import type {
  GenerateProgress,
  GenerateResult,
} from "@shorts/pipeline";
import type { ShortScript } from "@shorts/prompts";

export type JobStatus = "queued" | "running" | "done" | "error";

export type JobRecord = {
  id: string;
  status: JobStatus;
  createdAt: string;
  topic?: string;
  scriptInput?: string;
  mock: boolean;
  captionStyle: "explainer" | "minimal";
  progress: GenerateProgress[];
  result?: GenerateResult;
  shortScript?: ShortScript;
  error?: string;
  events: EventEmitter;
};

const jobs = new Map<string, JobRecord>();

export function createJob(init: {
  topic?: string;
  scriptInput?: string;
  mock: boolean;
  captionStyle: "explainer" | "minimal";
}): JobRecord {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job: JobRecord = {
    id,
    status: "queued",
    createdAt: new Date().toISOString(),
    topic: init.topic,
    scriptInput: init.scriptInput,
    mock: init.mock,
    captionStyle: init.captionStyle,
    progress: [],
    events: new EventEmitter(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): JobRecord | undefined {
  return jobs.get(id);
}

export function listJobs(): Omit<JobRecord, "events" | "result">[] {
  return [...jobs.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map(({ events: _e, result: _r, ...rest }) => rest);
}

export function pushProgress(job: JobRecord, progress: GenerateProgress): void {
  job.progress.push(progress);
  job.events.emit("progress", progress);
}

export function publicJobView(job: JobRecord) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    topic: job.topic,
    mock: job.mock,
    captionStyle: job.captionStyle,
    progress: job.progress,
    error: job.error,
    script: job.shortScript
      ? {
          title: job.shortScript.title,
          cta: job.shortScript.cta,
          captionHashtags: job.shortScript.captionHashtags,
        }
      : undefined,
    result: job.result
      ? {
          mp4Path: job.result.mp4Path,
          outDir: job.result.outDir,
          attributionPath: job.result.attributionPath,
          probe: job.result.probe,
        }
      : undefined,
  };
}
