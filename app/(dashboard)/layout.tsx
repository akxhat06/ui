import Sidebar from "@/components/sidebar";
                                                                                                                                                                                                                                                                               
export default function DashboardLayout({ children }: { children: React.ReactNode }) {                                                                                                                                                                                       
  return (
    <div className="min-h-screen bg-slate-50 md:flex">                                                                                                                                                                                                                       
      <Sidebar />                                                                                                                                                                                                                                                            
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
        {children}                                                                                                                                                                                                                                                           
      </main>   
    </div>                                                                                                                                                                                                                                                                   
  );            
}