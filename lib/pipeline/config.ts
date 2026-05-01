import type { ScrapeConfig, ScoreConfig } from "./types";
                                                                                                                                                                                                                     
  export const SCRAPE_CONFIG: ScrapeConfig = {
    endpoint:   process.env.SCRAPER_ENDPOINT ?? "https://ats.kenpath.ai/scrapper/jobs",                                                                                                                              
    keywords:   "",   // overridden by user profile                                                                                                                                                                  
    location:   "",   // overridden by user profile                                                                                                                                                                  
    experience: "0",  // overridden by user profile                                                                                                                                                                  
    pages:      process.env.SCRAPER_PAGES ?? "3",                                                                                                                                                                    
  };              
                                                                                                                                                                                                                     
  export const SCORE_CONFIG: ScoreConfig = {                                                                                                                                                                         
    model:     process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    resume:    "profile",                                                                                                                                                                                            
    threshold: Number(process.env.PASS_SCORE ?? 70),
  };  