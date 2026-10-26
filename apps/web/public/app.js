const $ = (sel) => document.querySelector(sel);

const els = {
  topicField: $("#topic-field"),
  scriptField: $("#script-field"),
  topic: $("#topic"),
  script: $("#script"),
  captionStyle: $("#caption-style"),
  mock: $("#mock"),
  generate: $("#generate"),
  busyHint: $("#busy-hint"),
  progress: $("#progress"),
  progressFill: $("#progress-fill"),
  progressSteps: $("#progress-steps"),
  progressMsg: $("#progress-msg"),
  resultEmpty: $("#result-empty"),
  resultBody: $("#result-body"),
  preview: $("#preview"),
  resultTitle: $("#result-title"),
  resultProbe: $("#result-probe"),
  download: $("#download"),
  copyCaption: $("#copy-caption"),
  copyHashtags: $("#copy-hashtags"),
  copyStatus: $("#copy-status"),
  captionBox: $("#caption-box"),
  envPill: $("#env-pill"),
};

const STEP_LABELS = [
  "Script beats",
  "Voiceover",
  "VO-locked cuts",
  "B-roll",
  "Captions",
  "Render MP4",
];

let mode = "topic";
let activeJobId = null;
let eventSource = null;
let captionPayload = null;

function setMode(next) {
  mode = next;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === next);
  });
  els.topicField.classList.toggle("hidden", next !== "topic");
  els.scriptField.classList.toggle("hidden", next !== "script");
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

async function refreshEnv() {
  try {
    const res = await fetch("/api/env-status");
    const data = await res.json();
    if (!data.openai) {
      els.mock.checked = true;
      els.envPill.textContent = "Mock mode — add OPENAI_API_KEY to .env for live";
      els.envPill.className = "env-pill warn";
    } else {
      const stock = data.pexels || data.pixabay ? "stock on" : "mock B-roll";
      els.envPill.textContent = `Live OpenAI · ${stock}`;
      els.envPill.className = "env-pill ok";
    }
  } catch {
    els.envPill.textContent = "Could not read env status";
    els.envPill.className = "env-pill warn";
  }
}

function resetProgress() {
  els.progress.hidden = false;
  els.progressFill.style.width = "0%";
  els.progressMsg.textContent = "Starting…";
  els.progressSteps.innerHTML = STEP_LABELS.map(
    (label) => `<li data-step="${label}">${label}</li>`,
  ).join("");
}

function applyProgress(p) {
  const pct = Math.min(100, Math.round((p.index / p.total) * 100));
  els.progressFill.style.width = `${pct}%`;
  els.progressMsg.textContent = p.message;
  const idx = Math.max(0, Math.min(STEP_LABELS.length, p.index) - 1);
  [...els.progressSteps.children].forEach((li, i) => {
    li.classList.toggle("done", i < idx || p.step === "done");
    li.classList.toggle("active", i === idx && p.step !== "done");
  });
  if (p.step === "done") {
    els.progressFill.style.width = "100%";
    [...els.progressSteps.children].forEach((li) => {
      li.classList.add("done");
      li.classList.remove("active");
    });
  }
}

function closeEvents() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

async function loadCaption(jobId) {
  const res = await fetch(`/api/jobs/${jobId}/caption`);
  if (!res.ok) throw new Error("Caption not ready");
  captionPayload = await res.json();
  els.captionBox.value = captionPayload.caption;
}

async function showResult(job) {
  els.resultEmpty.hidden = true;
  els.resultBody.hidden = false;
  els.resultTitle.textContent = job.script?.title ?? "Short ready";
  const probe = job.result?.probe;
  els.resultProbe.textContent = probe
    ? `${probe.width}×${probe.height} · ${probe.videoCodec} · ${probe.duration.toFixed(1)}s`
    : "";
  els.download.href = `/api/jobs/${job.id}/download`;
  els.preview.src = `/api/jobs/${job.id}/download`;
  await loadCaption(job.id);
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    els.copyStatus.textContent = `${label} copied.`;
  } catch {
    els.copyStatus.textContent = "Clipboard blocked — select the text box and copy manually.";
  }
}

els.copyCaption.addEventListener("click", () => {
  if (!captionPayload) return;
  void copyText(captionPayload.caption, "Caption");
});

els.copyHashtags.addEventListener("click", () => {
  if (!captionPayload) return;
  void copyText(captionPayload.hashtagsOnly, "Hashtags");
});

function subscribe(jobId) {
  closeEvents();
  eventSource = new EventSource(`/api/jobs/${jobId}/events`);
  eventSource.addEventListener("progress", (ev) => {
    applyProgress(JSON.parse(ev.data));
  });
  eventSource.addEventListener("done", async (ev) => {
    const job = JSON.parse(ev.data);
    applyProgress({
      step: "done",
      index: 6,
      total: 6,
      message: "Done — download your MP4 below.",
    });
    try {
      await showResult(job);
    } catch (err) {
      els.progressMsg.textContent =
        err instanceof Error ? err.message : String(err);
    }
    els.generate.disabled = false;
    els.busyHint.hidden = true;
    closeEvents();
  });
  eventSource.addEventListener("error", (ev) => {
    let msg = "Generation failed.";
    try {
      if (ev.data) msg = JSON.parse(ev.data).error || msg;
    } catch {
      /* ignore parse */
    }
    els.progressMsg.textContent = msg;
    els.generate.disabled = false;
    els.busyHint.hidden = true;
    closeEvents();
  });
}

els.generate.addEventListener("click", async () => {
  els.generate.disabled = true;
  els.busyHint.hidden = true;
  els.copyStatus.textContent = "";
  captionPayload = null;
  resetProgress();

  const payload = {
    captionStyle: els.captionStyle.value,
    mock: els.mock.checked,
  };
  if (mode === "topic") {
    payload.topic = els.topic.value.trim();
  } else {
    payload.script = els.script.value.trim();
  }

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    activeJobId = data.jobId;
    if (data.mock) {
      els.busyHint.hidden = false;
      els.busyHint.textContent = "Running in mock mode (sine VO + placeholder B-roll).";
    }
    subscribe(activeJobId);
  } catch (err) {
    els.progressMsg.textContent =
      err instanceof Error ? err.message : String(err);
    els.generate.disabled = false;
  }
});

void refreshEnv();
