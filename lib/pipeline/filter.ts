import type { Job } from "./types";

export function filterByScore(jobs: Job[], threshold: number): Job[] {
  return jobs
    .filter((j) => typeof j.score === "number" && j.score >= threshold)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
