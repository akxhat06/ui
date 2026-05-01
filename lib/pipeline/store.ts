import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { RunRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const RUNS_PATH = path.join(DATA_DIR, "runs.json");
const MAX_RUNS = 50;

let memory: RunRecord[] | null = null;

async function load(): Promise<RunRecord[]> {
  if (memory) return memory;
  if (!existsSync(RUNS_PATH)) {
    memory = [];
    return memory;
  }
  try {
    const buf = await readFile(RUNS_PATH, "utf8");
    memory = JSON.parse(buf) as RunRecord[];
  } catch {
    memory = [];
  }
  return memory;
}

async function persist(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(RUNS_PATH, JSON.stringify(memory ?? [], null, 2), "utf8");
}

export async function listRuns(): Promise<RunRecord[]> {
  const runs = await load();
  return [...runs].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export async function getRun(id: string): Promise<RunRecord | undefined> {
  const runs = await load();
  return runs.find((r) => r.id === id);
}

export async function getCurrent(): Promise<RunRecord | undefined> {
  const runs = await load();
  return runs.find((r) => r.status === "running");
}

export async function getLatest(): Promise<RunRecord | undefined> {
  const runs = await listRuns();
  return runs[0];
}

export async function upsertRun(run: RunRecord): Promise<void> {
  const runs = await load();
  const idx = runs.findIndex((r) => r.id === run.id);
  if (idx >= 0) runs[idx] = run;
  else runs.unshift(run);
  if (runs.length > MAX_RUNS) runs.length = MAX_RUNS;
  memory = runs;
  await persist();
}
