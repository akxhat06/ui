import type { Job, ScrapeConfig } from "./types";

function normalizeUrl(u: string | undefined): string {
  if (!u) return "";
  try {
    const url = new URL(u);
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

function toJob(raw: unknown, source: string): Job | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const url = normalizeUrl(
    pickString(o, ["url", "jobUrl", "job_url", "link", "applyUrl"])
  );
  const title = pickString(o, ["title", "jobTitle", "name"]);
  if (!url || !title) return null;

  return {
    id: url,
    url,
    title,
    company: pickString(o, ["company", "companyName", "employer"]),
    location: pickString(o, ["location", "loc", "city", "place"]),
    experience: pickString(o, ["experience", "exp", "experienceText"]),
    postedOn: pickString(o, ["postedOn", "posted", "postedDate", "date"]) || null,
    description: pickString(o, [
      "description",
      "jd",
      "summary",
      "snippet",
      "shortDesc",
    ]),
    salary: pickString(o, ["salary", "ctc", "package"]) || undefined,
    source,
    scrapedAt: new Date().toISOString(),
  };
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const k of ["jobs", "data", "results", "items", "postings"]) {
      const v = o[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

export async function scrapeJobs(cfg: ScrapeConfig): Promise<Job[]> {
  const base = cfg.endpoint.startsWith("http") ? cfg.endpoint : `https://${cfg.endpoint}`;
  const url = new URL(base);
  url.searchParams.set("keywords", cfg.keywords);
  url.searchParams.set("location", cfg.location);
  url.searchParams.set("experience", cfg.experience);
  url.searchParams.set("pages", cfg.pages);

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!resp.ok) {
    throw new Error(`Scraper returned ${resp.status} ${resp.statusText}`);
  }

  const payload = await resp.json();
  const list = extractList(payload);
  const jobs: Job[] = [];
  for (const raw of list) {
    const job = toJob(raw, "naukri");
    if (job) jobs.push(job);
  }
  return jobs;
}
