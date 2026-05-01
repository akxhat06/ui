import type { Job } from "./types";

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function parsePostedOn(s: string | null): string | null {
  if (!s) return null;
  const t = s.toLowerCase().trim();

  const direct = Date.parse(s);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString().slice(0, 10);

  const m = t.match(/(\d+)\s*(day|days|hour|hours|hr|hrs|min|mins|week|weeks|month|months)\s*ago/);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    const now = new Date();
    if (unit.startsWith("day")) now.setDate(now.getDate() - n);
    else if (unit.startsWith("hour") || unit.startsWith("hr")) now.setHours(now.getHours() - n);
    else if (unit.startsWith("min")) now.setMinutes(now.getMinutes() - n);
    else if (unit.startsWith("week")) now.setDate(now.getDate() - n * 7);
    else if (unit.startsWith("month")) now.setMonth(now.getMonth() - n);
    return now.toISOString().slice(0, 10);
  }

  if (t.includes("today") || t.includes("just now")) {
    return new Date().toISOString().slice(0, 10);
  }
  return s;
}

export function normalizeAndDedupe(jobs: Job[], seenUrls: Set<string>): Job[] {
  const out: Job[] = [];
  const seenInBatch = new Set<string>();

  for (const j of jobs) {
    const url = j.url.trim();
    if (!url) continue;
    if (seenUrls.has(url) || seenInBatch.has(url)) continue;
    seenInBatch.add(url);

    out.push({
      ...j,
      title: cleanText(j.title),
      company: cleanText(j.company),
      location: cleanText(j.location),
      experience: cleanText(j.experience),
      description: cleanText(j.description),
      postedOn: parsePostedOn(j.postedOn),
    });
  }

  return out;
}
