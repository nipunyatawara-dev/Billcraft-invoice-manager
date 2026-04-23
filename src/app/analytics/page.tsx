"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { formatCurrency, getClientsFromInvoices, getInvoiceTotals } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";

export default function Analytics() {
  const { invoices } = useInvoices();
  const { currency } = useCurrency();
  const totals = getInvoiceTotals(invoices);
  const clients = getClientsFromInvoices(invoices);
  const paidRatio = invoices.length > 0 ? Math.round((totals.paidCount / invoices.length) * 100) : 0;
  const averageInvoice = invoices.length > 0 ? totals.totalAmount / invoices.length : 0;
  const averageClientValue = clients.length > 0 ? totals.totalAmount / clients.length : 0;
  const topClient = [...clients].sort((a, b) => b.totalBilled - a.totalBilled)[0];

  return (
    <DashboardLayout>
      <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 lg:p-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-sm font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-1">Overview</p>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] leading-[1.1]">
              Analytics
            </h1>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
             <div className="bg-[#212842]/5 dark:bg-[#F0E7D5]/5 p-1 rounded-2xl flex border border-[#212842]/10 dark:border-[#F0E7D5]/10 w-full md:w-auto overflow-x-auto">
                <button className="px-4 py-1.5 rounded-xl bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] text-sm font-medium shadow-sm transition-all whitespace-nowrap">This Month</button>
                <button className="px-4 py-1.5 rounded-xl text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:text-[#212842] dark:hover:text-[#F0E7D5] text-sm font-medium transition-all whitespace-nowrap">Last Quarter</button>
                <button className="px-4 py-1.5 rounded-xl text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:text-[#212842] dark:hover:text-[#F0E7D5] text-sm font-medium transition-all whitespace-nowrap">This Year</button>
             </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto mb-4">
          
          {/* Main Chart Area */}
          <div className="md:col-span-2 bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-3xl p-6 lg:p-8 flex flex-col justify-between border border-[#212842]/6 dark:border-[#F0E7D5]/6 min-h-[350px] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] mb-1">Revenue Flow</h3>
                <p className="text-sm font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40">+12% from last period</p>
              </div>
              <div className="size-10 rounded-xl bg-[#212842]/5 dark:bg-[#F0E7D5]/5 flex items-center justify-center">
                 <span className="material-symbols-outlined text-[#212842] dark:text-[#F0E7D5]">monitoring</span>
              </div>
            </div>
            
            {/* Mock Chart representation */}
            <div className="flex-1 flex items-end gap-2 mt-4 pt-4 border-t border-[#212842]/5 dark:border-[#F0E7D5]/5">
               {/* Just simple bars */}
               <div className="flex-1 bg-[#212842]/10 dark:bg-[#F0E7D5]/10 rounded-t-xl h-[30%] hover:bg-[#212842]/20 dark:hover:bg-[#F0E7D5]/20 transition-all relative group/bar"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100">$2.1k</span></div>
               <div className="flex-1 bg-[#212842]/20 dark:bg-[#F0E7D5]/20 rounded-t-xl h-[50%] hover:bg-[#212842]/30 dark:hover:bg-[#F0E7D5]/30 transition-all relative group/bar"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100">$3.4k</span></div>
               <div className="flex-1 bg-[#212842]/10 dark:bg-[#F0E7D5]/10 rounded-t-xl h-[40%] hover:bg-[#212842]/20 dark:hover:bg-[#F0E7D5]/20 transition-all relative group/bar"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100">$2.8k</span></div>
               <div className="flex-1 bg-[#212842]/30 dark:bg-[#F0E7D5]/30 rounded-t-xl h-[70%] hover:bg-[#212842]/40 dark:hover:bg-[#F0E7D5]/40 transition-all relative group/bar"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100">$5.2k</span></div>
               <div className="flex-1 bg-[#212842]/15 dark:bg-[#F0E7D5]/15 rounded-t-xl h-[45%] hover:bg-[#212842]/25 dark:hover:bg-[#F0E7D5]/25 transition-all relative group/bar"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100">$3.1k</span></div>
               <div className="flex-1 bg-[#212842]/80 dark:bg-[#F0E7D5]/80 rounded-t-xl h-[90%] shadow-lg transition-all relative group/bar"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100">$8.4k</span></div>
               <div className="flex-1 bg-[#212842]/40 dark:bg-[#F0E7D5]/40 rounded-t-xl h-[60%] hover:bg-[#212842]/50 dark:hover:bg-[#F0E7D5]/50 transition-all relative group/bar"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover/bar:opacity-100">$4.5k</span></div>
            </div>
            <div className="flex justify-between mt-3 text-[10px] font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 px-2 uppercase tracking-widest">
               <span>Mon</span>
               <span>Tue</span>
               <span>Wed</span>
               <span>Thu</span>
               <span>Fri</span>
               <span>Sat</span>
               <span>Sun</span>
            </div>
          </div>

          {/* Realizer Rate */}
          <div className="bg-[#212842] dark:bg-[#F0E7D5] rounded-3xl p-6 lg:p-8 flex flex-col justify-between border border-[#212842]/10 dark:border-[#F0E7D5]/10 relative overflow-hidden group min-h-[350px]">
             <div className="absolute inset-0 bg-gradient-to-br from-[#F0E7D5]/5 to-transparent dark:from-[#212842]/5 pointer-events-none" />
             <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-[#F0E7D5]/10 dark:bg-[#212842]/10 blur-3xl pointer-events-none group-hover:bg-[#F0E7D5]/15 dark:group-hover:bg-[#212842]/15 transition-all duration-700" />
            
             <div className="relative z-10 flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-[#F0E7D5]/60 dark:text-[#212842]/60 tracking-wide">Paid Ratio</p>
                <div className="size-10 rounded-xl bg-[#F0E7D5]/10 dark:bg-[#212842]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#F0E7D5] dark:text-[#212842]">pie_chart</span>
                </div>
             </div>
             <div className="relative z-10 flex-1 flex flex-col justify-center items-center">
                 {/* Circle Graph */}
                 <div className="relative size-36 mb-4">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                       <path
                         className="text-[#F0E7D5]/20 dark:text-[#212842]/20"
                         d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                         fill="none"
                         stroke="currentColor"
                         strokeWidth="3.5"
                       />
                       <path
                         className="text-[#F0E7D5] dark:text-[#212842]"
                         strokeDasharray={`${paidRatio}, 100`}
                         d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                         fill="none"
                         stroke="currentColor"
                         strokeWidth="3.5"
                         strokeLinecap="round"
                       />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <span className="text-3xl font-semibold tracking-tighter text-[#F0E7D5] dark:text-[#212842] font-display">{paidRatio}%</span>
                    </div>
                 </div>
                 <p className="text-[#F0E7D5]/80 dark:text-[#212842]/80 text-sm font-medium text-center">{paidRatio}% of invoices are currently marked paid.</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
           {/* Average Invoice Value */}
           <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-3xl p-6 lg:p-7 flex flex-col justify-between border border-[#212842]/6 dark:border-[#F0E7D5]/6 hover:border-[#212842]/15 dark:hover:border-[#F0E7D5]/15 transition-all duration-300 min-h-[160px] group">
              <div className="flex items-center justify-between">
                 <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Avg. Invoice</p>
                 <div className="size-10 rounded-xl bg-[#212842]/6 dark:bg-[#F0E7D5]/6 flex items-center justify-center group-hover:scale-105 transition-transform">
                   <span className="material-symbols-outlined text-[18px] text-[#212842]/60 dark:text-[#F0E7D5]/60">request_quote</span>
                 </div>
              </div>
              <div>
                 <h3 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] mb-1 font-display">{formatCurrency(averageInvoice, currency)}</h3>
                 <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium text-emerald-600 dark:text-emerald-400">+5.2% than last month</p>
              </div>
           </div>

           {/* Client LTV */}
           <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-3xl p-6 lg:p-7 flex flex-col justify-between border border-[#212842]/6 dark:border-[#F0E7D5]/6 hover:border-[#212842]/15 dark:hover:border-[#F0E7D5]/15 transition-all duration-300 min-h-[160px] group">
              <div className="flex items-center justify-between">
                 <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Avg. LTV</p>
                 <div className="size-10 rounded-xl bg-[#212842]/6 dark:bg-[#F0E7D5]/6 flex items-center justify-center group-hover:scale-105 transition-transform">
                   <span className="material-symbols-outlined text-[18px] text-[#212842]/60 dark:text-[#F0E7D5]/60">diamond</span>
                 </div>
              </div>
              <div>
                 <h3 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] mb-1 font-display">{formatCurrency(averageClientValue, currency)}</h3>
                 <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium">Per client lifetime</p>
              </div>
           </div>

           {/* Top Performing Service */}
           <div className="md:col-span-2 bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-3xl p-6 lg:p-7 flex flex-col justify-between border border-[#212842]/6 dark:border-[#F0E7D5]/6 hover:border-[#212842]/15 dark:hover:border-[#F0E7D5]/15 transition-all duration-300 min-h-[160px] relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-l from-[#212842]/5 dark:from-[#F0E7D5]/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between mb-4">
                 <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Top Client</p>
                 <div className="size-10 rounded-xl bg-[#212842]/6 dark:bg-[#F0E7D5]/6 flex items-center justify-center group-hover:scale-105 transition-transform">
                   <span className="material-symbols-outlined text-[18px] text-[#212842]/60 dark:text-[#F0E7D5]/60">star</span>
                 </div>
              </div>
              <div className="flex justify-between items-end relative z-10">
                 <div>
                   <h3 className="text-xl lg:text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] mb-1 font-display">{topClient?.name || "No client yet"}</h3>
                   <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium">Highest billed client by invoice total</p>
                 </div>
                 <div className="text-right">
                    <p className="text-lg font-semibold text-[#212842] dark:text-[#F0E7D5]">{formatCurrency(topClient?.totalBilled || 0, currency)}</p>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">YTD</p>
                 </div>
              </div>
           </div>
        </div>

      </main>

      <footer className="mt-auto border-t border-[#212842]/6 dark:border-[#F0E7D5]/6 p-6 text-center">
        <p className="text-xs font-medium text-[#212842]/30 dark:text-[#F0E7D5]/30">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </DashboardLayout>
  );
}
