"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { useState } from "react";

export const INVOICES = [
  {
    id: "#INV-0089",
    client: "Acme Corp",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsXeqo_w1hhyG5J0kVBACXMjyKrUpAOavnYe05vjVQhQ6TupxXOY6urT_uDg_aovFvQM9FVGKwnGSkJCJfiQHrWhpGS0OkKIctnqyEHDpgG81YNpHtbZkF4grPBORiQLbgsNleUjNLsTbhtSH_cvpx9UNuiqXqPyHlrElxGbUE6YY8FkObAeSaIxDuCAtTFTVZrA_AW7bBv1AsHOErx1NzARISTL8MPnwpz7I_L9ZdWiaPLYzlmVaWwEEV0EdWFk7_MTRnVggu_fI",
    date: "Oct 12, 2023",
    amount: "$2,450.00",
    status: "Paid",
    statusColor: "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-100",
    clientColor: "bg-yellow-400"
  },
  {
    id: "#INV-0090",
    client: "Sarah Jenkins",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDCDi7ktVtRXHtCGjKYlY3hUraj2z4v9h93mnRJoWdHQcidX3hT_UwnrRwbUlEh-NwV0zM_A3-1q1DA9LQgnaKMxRJUrLR0fTuNjVdprsV1IA3-TeJY_VM5lGn0mpXmmYUn6Ab6m3nuCbPZnL9lBdu2U_56Ltt5Rps9-q0538Nue77DiRYgHZ7QT3PMJolEZ99xrm9cjbweK_ocj77NaZsyFleo8879bysKPmsVKeRcfxGRYc4cQimFlVOtse9eGFOmf0mT295MifQ",
    date: "Oct 14, 2023",
    amount: "$850.00",
    status: "Unpaid",
    statusColor: "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    clientColor: "bg-blue-400"
  },
  {
    id: "#INV-0091",
    client: "Global Logistics",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkMaqJSltMTbMHXmsFM_hXhpNf1BzjHFLW-ES7ZIAgZZbaLCLTDacEqWABBuE1b3e2eNM1ALPEGTSGLcTHiJbSHM8DxcnojHo5FS1AZttmx8U524sJWMAUzecbyKNvyUgAHyi0_XMQ18pSEGQeYJfbvXcfXOY3UERlwtRv7-dM2Tsoq1OdNxTrAH363vtmSEqtD8GqRbxBEyaO4bJEuRc9uwRtS4YJi8rVN4qaJydC8uiZsvjvFmyfPktcZ_yjIWFmx7yCsiaNWKw",
    date: "Oct 15, 2023",
    amount: "$5,120.00",
    status: "Overdue",
    statusColor: "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-100",
    clientColor: "bg-purple-400"
  },
  {
    id: "#INV-0092",
    client: "Pixel Perfect Ltd",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuANMJLtMXpSsmkSFHVzC42VEDqWeZWIrggcJqfUrJUMISNnCcOLAVGAAoweif4AGm_KovI3V_tWdVuTGfLm1diKdY3jj2Ott1F0KFSJCqZBICQOk8REP-P3n9WCQP2uOizmID5U5uYyrn_U7UBP3dJosV9PiQfcEuO-2uwCmJXowL0Bxothp_flG0y1USEeorl49cduyYFaJMP6XRw14fXmyQEJvoUoVW_2a5lLZm1-F6R49gvsPcB4GlU6VvI02uPLIjdc65J2Mjs",
    date: "Oct 18, 2023",
    amount: "$1,200.00",
    status: "Paid",
    statusColor: "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-100",
    clientColor: "bg-green-400"
  }
];

export default function Invoices() {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusVal, setStatusVal] = useState("All Status");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [dateRangeVal, setDateRangeVal] = useState("Last 30 Days");

  return (
    <DashboardLayout>
      <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 lg:p-10 space-y-10">
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Invoices</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your billing and client payments</p>
            </div>
            <button className="bg-primary text-white px-5 py-2.5 font-medium rounded-xl flex items-center gap-2 transition-all hover:bg-primary/90 shadow-sm active:scale-95">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Create Invoice
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5">
                <label className="block text-xs font-medium text-slate-500 mb-2">Search Invoices</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                  <input
                    className="w-full pl-10 pr-4 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary py-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 outline-none transition-all dark:text-white"
                    placeholder="Search by ID, client name..."
                    type="text"
                  />
                </div>
              </div>
              <div className="lg:col-span-4 flex gap-3 overflow-x-auto overflow-y-hidden lg:overflow-visible pb-2 lg:pb-0">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-slate-500 mb-2">Status</label>
                  <div className="relative h-[42px]">
                    <button 
                      onClick={() => { setIsStatusOpen(!isStatusOpen); setIsDateRangeOpen(false); }}
                      className={`w-full h-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none flex items-center justify-between px-3 text-sm font-medium text-slate-700 dark:text-slate-300`}
                    >
                      <span className="truncate">{statusVal}</span>
                      <span className={`material-symbols-outlined text-[20px] pointer-events-none text-slate-400 transition-transform duration-200 ${isStatusOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    <div 
                      className={`absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 origin-top transition-all duration-200 ease-out overflow-hidden ${isStatusOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}
                    >
                      <ul className="py-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {['All Status', 'Paid', 'Unpaid', 'Overdue'].map((opt) => (
                          <li key={opt}>
                            <button 
                              onClick={() => { setStatusVal(opt); setIsStatusOpen(false); }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              {opt}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-slate-500 mb-2">Date Range</label>
                  <div className="relative h-[42px]">
                    <button 
                      onClick={() => { setIsDateRangeOpen(!isDateRangeOpen); setIsStatusOpen(false); }}
                      className={`w-full h-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none flex items-center justify-between px-3 text-sm font-medium text-slate-700 dark:text-slate-300`}
                    >
                      <span className="truncate">{dateRangeVal}</span>
                      <span className={`material-symbols-outlined text-[20px] pointer-events-none text-slate-400 transition-transform duration-200 ${isDateRangeOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    <div 
                      className={`absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 origin-top transition-all duration-200 ease-out overflow-hidden ${isDateRangeOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}
                    >
                      <ul className="py-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {['Last 30 Days', 'Last 90 Days', 'This Year', 'Custom Range'].map((opt) => (
                          <li key={opt}>
                            <button 
                              onClick={() => { setDateRangeVal(opt); setIsDateRangeOpen(false); }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              {opt}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 flex items-end">
                <button className="w-full h-[42px] bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700/70 transition-colors border border-transparent dark:border-slate-700">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-4 pl-6 font-medium">Invoice #</th>
                  <th className="py-4 font-medium">Client</th>
                  <th className="py-4 font-medium">Issue Date</th>
                  <th className="py-4 text-right font-medium">Amount</th>
                  <th className="py-4 text-center font-medium">Status</th>
                  <th className="py-4 text-right pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {INVOICES.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                    <td className="py-4 pl-6 font-semibold text-slate-900 dark:text-white text-sm">{inv.id}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 ${inv.clientColor} overflow-hidden shrink-0`}>
                          <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                        </div>
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{inv.client}</span>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-slate-500 dark:text-slate-400">{inv.date}</td>
                    <td className="py-4 text-right font-semibold text-sm text-slate-900 dark:text-white">{inv.amount}</td>
                    <td className="py-4 text-center">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${inv.statusColor}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="View">
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Download">
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                        <button className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Edit">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-2">
            <p className="text-sm text-slate-500 font-medium">Showing 1 to 4 of 42 invoices</p>
            <div className="flex gap-1.5">
              <button className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors disabled:opacity-50">Previous</button>
              <button className="px-3.5 py-1.5 text-sm font-medium rounded-lg bg-primary text-white shadow-sm transition-colors">1</button>
              <button className="px-3.5 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors">2</button>
              <button className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors">Next</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6 text-center">
        <p className="text-xs font-medium text-slate-500">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </DashboardLayout>
  );
}
