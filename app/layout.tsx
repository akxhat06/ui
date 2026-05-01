import "./globals.css";                                                                                                                                                                 
  import type { Metadata } from "next";
  import { Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";                                                                                                           
                                                                                                                                                                                          
  const serif = Instrument_Serif({
    subsets: ["latin"],                                                                                                                                                                   
    weight: "400",
    style: ["normal", "italic"],
    variable: "--font-serif",
    display: "swap",                                                                                                                                                                      
  });
                                                                                                                                                                                          
  const sans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
  });                                                                                                                                                                                     
  
  const mono = JetBrains_Mono({                                                                                                                                                           
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
  });

  export const metadata: Metadata = {                                                                                                                                                     
    title: "ATS Tracker",
    description: "A workspace for the job hunt",                                                                                                                                          
  };                                                                                                                                                                                      
   
  export default function RootLayout({ children }: { children: React.ReactNode }) {                                                                                                       
    return (      
      <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
        <body className="font-sans antialiased text-ink">{children}</body>                                                                                                                
      </html>
    );                                                                                                                                                                                    
  } 