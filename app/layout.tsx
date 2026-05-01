import "./globals.css";
import type { Metadata } from "next";                                                                                                                                                                              
import { DM_Sans, JetBrains_Mono } from "next/font/google";                                                                                                                                                        

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });                                                                                                                            
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
                                                                                                                                                                                                                   
export const metadata: Metadata = {
  title: "Job Hunter Pipeline",                                                                                                                                                                                            
  description: "A workspace for the job hunt",                                                                                                                                                                     
};
                                                                                                                                                                                                                   
const themeScript = `                                                                                                                                                                                              
(function(){
  try {                                                                                                                                                                                                            
    var t = localStorage.getItem('theme');
    var d = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (d) document.documentElement.classList.add('dark');                                                                                                                                                         
  } catch(e) {}                                                                                                                                                                                                    
})();                                                                                                                                                                                                              
`;                                                                                                                                                                                                                 
                
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>                                                                                                                                                                                                       
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>                                                                                                                                                                                                      
      <body className="font-sans antialiased">{children}</body>
    </html>                                                                                                                                                                                                        
  );            
}