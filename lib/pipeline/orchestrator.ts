import { randomUUID } from "node:crypto";
import { SCRAPE_CONFIG, SCORE_CONFIG } from "./config";
import { scrapeJobs } from "./scrape";
import { normalizeAndDedupe } from "./normalize";
import { scoreJobs } from "./score";
import { filterByScore } from "./filter";
import { appendJobs, loadSavedUrls, XLSX_PATH } from "./xlsx-writer";
import { getCurrent, upsertRun } from "./store";
import type { Job, RunRecord, StepName, StepRecord } from "./types";

function emptyStep(name: StepName): StepRecord {
  return {
    name,
    status: "idle",
    startedAt: null,
    finishedAt: null,
    durationMs: 0,
    count: 0,
  };
}

function newRun(trigger: "manual" | "cron"): RunRecord {
  return {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    trigger,
    steps: (["scrape", "normalize", "score", "filter", "save"] as StepName[]).map(emptyStep),
    totals: { scraped: 0, afterDedupe: 0, scored: 0, passed: 0, saved: 0 },
  };
}

async function runStep<T>(
  run: RunRecord,
  name: StepName,
  fn: () => Promise<{ value: T; count: number; message?: string }>
): Promise<T> {
  const step = run.steps.find((s) => s.name === name)!;
  step.status = "running";
  step.startedAt = new Date().toISOString();
  await upsertRun(run);
  const t0 = Date.now();
  try {
    const { value, count, message } = await fn();
    step.status = "done";
    step.count = count;
    step.message = message;
    step.finishedAt = new Date().toISOString();
    step.durationMs = Date.now() - t0;
    await upsertRun(run);
    return value;
  } catch (e) {
    step.status = "error";
    step.message = e instanceof Error ? e.message : String(e);
    step.finishedAt = new Date().toISOString();
    step.durationMs = Date.now() - t0;
    throw e;
  }
}

export async function runWorkflow(): Promise<RunRecord> {
  const existing = await getCurrent();
  if (existing) return existing;

  const run = newRun("manual");
  await upsertRun(run);

  try {
    const scraped = await runStep(run, "scrape", async () => {
      const jobs = await scrapeJobs(SCRAPE_CONFIG);
      run.totals.scraped = jobs.length;
      return { value: jobs, count: jobs.length };
    });

    const normalized = await runStep(run, "normalize", async () => {
      const seen = await loadSavedUrls();
      const jobs = normalizeAndDedupe(scraped, seen);
      run.totals.afterDedupe = jobs.length;
      return {
        value: jobs,
        count: jobs.length,
        message: `${scraped.length - jobs.length} duplicates dropped`,
      };
    });

    const scored = await runStep(run, "score", async () => {
      if (normalized.length === 0) return { value: [] as Job[], count: 0 };
      const jobs = await scoreJobs(normalized, SCORE_CONFIG);
      run.totals.scored = jobs.length;
      return { value: jobs, count: jobs.length };
    });

    const passed = await runStep(run, "filter", async () => {
      const jobs = filterByScore(scored, SCORE_CONFIG.threshold);
      run.totals.passed = jobs.length;
      return {
        value: jobs,
        count: jobs.length,
        message: `≥ ${SCORE_CONFIG.threshold}`,
      };
    });

    await runStep(run, "save", async () => {
      if (passed.length === 0) {
        return { value: { added: 0, total: 0 }, count: 0, message: "nothing to save" };
      }
      const result = await appendJobs(passed);
      run.totals.saved = result.added;
      run.xlsxPath = XLSX_PATH;
      return {
        value: result,
        count: result.added,
        message: `${result.total} total in sheet`,
      };
    });

    run.status = "done";
    run.finishedAt = new Date().toISOString();
    await upsertRun(run);
    return run;
  } catch (e) {
    run.status = "error";
    run.error = e instanceof Error ? e.message : String(e);
    run.finishedAt = new Date().toISOString();
    await upsertRun(run);
    return run;
  }
}
