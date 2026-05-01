import type { ScrapeConfig, ScoreConfig } from "./types";

export const SCRAPE_CONFIG: ScrapeConfig = {
  endpoint: process.env.SCRAPER_ENDPOINT ?? "https://ats.kenpath.ai/scrapper/jobs",
  keywords: process.env.SCRAPER_KEYWORDS ?? "react, node, mern, angular",
  location: process.env.SCRAPER_LOCATION ?? "bangalore",
  experience: process.env.SCRAPER_EXPERIENCE ?? "0",
  pages: process.env.SCRAPER_PAGES ?? "3",
};

export const SCORE_CONFIG: ScoreConfig = {
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  resume: process.env.RESUME_FILE ?? "akshat-resume.pdf",
  threshold: Number(process.env.PASS_SCORE ?? 70),
};

export const RESUME_SUMMARY =
  process.env.RESUME_SUMMARY ??
  `Akshat — full-stack engineer based in Bengaluru. Strong in React, Node.js,
TypeScript, Next.js. Built MERN apps and Angular apps. Comfortable with REST,
GraphQL, AWS, Docker. Looking for senior/lead full-stack or backend roles in
product companies. Open to remote-first or Bengaluru-onsite. Avoid pure-frontend
contractor postings and roles that require >8 yrs SAP/ABAP.`;

export const CRON_SCHEDULE = process.env.WORKFLOW_CRON ?? "0 */4 * * *";
