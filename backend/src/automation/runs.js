/**
 * Automation run registry + live frame capture.
 *
 * Powers the demo "filmstrip": while a browser-automation run executes (headed
 * on the demo laptop, or headless in the cloud), we screenshot the active page
 * on a timer and append each frame to an in-memory run record. The frontend
 * polls GET /api/automation/runs/:id and renders the frames as they arrive, so
 * the audience sees the window "opening and signing in" even when the real
 * Chromium window isn't on the projector.
 *
 * In-memory only (no DB) — these are ephemeral demo artifacts. Old runs are
 * trimmed so a long session can't leak memory.
 */
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');
const MAX_RUNS = 25;

/** @type {Map<string, any>} */
const runs = new Map();

function newId() {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function createRun(service, action) {
  const run = {
    id: newId(),
    service,
    action,
    status: 'running', // running | done | error
    frames: [],         // [{ seq, url, label, ts }]
    steps: [],          // human-readable progress log
    result: null,       // final runner result
    error: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
  runs.set(run.id, run);

  // Trim oldest runs so memory stays bounded over a long demo session.
  if (runs.size > MAX_RUNS) {
    const oldest = [...runs.values()].sort((a, b) => a.startedAt - b.startedAt)[0];
    if (oldest) runs.delete(oldest.id);
  }
  return run;
}

function getRun(id) {
  return runs.get(id) || null;
}

function listRuns() {
  return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt);
}

function pushStep(run, label) {
  if (!run || !label) return;
  run.steps.push({ label, ts: Date.now() });
}

// Append a frame from an in-memory screenshot buffer (used by the computer-use
// agent, which screenshots once per action rather than on a timer).
function pushFrame(run, buffer, label) {
  if (!run || !buffer) return;
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const seq = run.frames.length;
  const file = `${run.id}-${String(seq).padStart(3, '0')}.jpg`;
  try {
    fs.writeFileSync(path.join(SCREENSHOT_DIR, file), buffer);
    run.frames.push({ seq, url: `/screenshots/${file}`, label: label || '', ts: Date.now() });
  } catch {
    /* disk error — skip frame, don't break the run */
  }
}

function finishRun(run, { result, error } = {}) {
  if (!run) return;
  run.status = error ? 'error' : 'done';
  run.result = result || null;
  run.error = error ? (error.message || String(error)) : null;
  run.finishedAt = Date.now();
}

/**
 * Begin screenshotting `page` into the run on an interval. Returns a stop()
 * function that captures one final frame and clears the timer. Safe to call
 * stop() multiple times. Never throws — a failed frame is simply skipped.
 */
function startFrameCapture(run, page, { intervalMs = 1200, label } = {}) {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  let seq = 0;
  let capturing = false;
  let stopped = false;

  async function capture(frameLabel) {
    if (capturing || stopped || page.isClosed?.()) return;
    capturing = true;
    try {
      const file = `${run.id}-${String(seq).padStart(3, '0')}.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, file) });
      run.frames.push({
        seq,
        url: `/screenshots/${file}`,
        label: frameLabel || (() => { try { return page.url(); } catch { return ''; } })(),
        ts: Date.now(),
      });
      seq += 1;
    } catch {
      /* page navigating / closed mid-shot — skip this frame */
    } finally {
      capturing = false;
    }
  }

  const timer = setInterval(() => { capture(); }, intervalMs);
  // Grab an immediate first frame so the filmstrip isn't empty on the first poll.
  capture(label || 'start');

  return async function stop(finalLabel) {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    await capture(finalLabel || 'done');
  };
}

module.exports = {
  SCREENSHOT_DIR,
  createRun,
  getRun,
  listRuns,
  pushStep,
  pushFrame,
  finishRun,
  startFrameCapture,
};
