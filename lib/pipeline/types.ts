export type Job = {
  id: string;
  url: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  postedOn: string | null;
  description: string;
  salary?: string;
  source: string;
  scrapedAt: string;
  score?: number;
  reason?: string;
};

export type StepName = "scrape" | "normalize" | "score" | "filter" | "save";
export type StepStatus = "idle" | "running" | "done" | "error" | "skipped";

export type StepRecord = {
  name: StepName;
  status: StepStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number;
  count: number;
  message?: string;
};

export type UserContext = {
  userId: string; 
  resumeSummary: string;                                                                                                                                                                                           
  techStacks: string[];
  experience: number;
  location: string;
};                                                                                                                                                                                                                 

export type RunRecord = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "done" | "error";
  cancelRequested?: boolean;
  steps: StepRecord[];
  totals: {
    scraped: number;
    afterDedupe: number;
    scored: number;
    passed: number;
    saved: number;
  };
  error?: string;
  xlsxPath?: string;
};

export type ScrapeConfig = {
  endpoint: string;
  keywords: string;
  location: string;
  experience: string;
  pages: string;
};

export type ScoreConfig = {
  model: string;
  resume: string;
  threshold: number;
};
