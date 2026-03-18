"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

const INVOICES = [
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

export default function Home() {
  const [status, setStatus] = useState("All Status");
  const [dateRange, setDateRange] = useState("Last 30 Days");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b-3 border-black bg-white dark:bg-slate-900 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-primary comic-border-sm flex items-center justify-center text-white">
            <span className="material-symbols-outlined font-bold">receipt_long</span>
          </div>
          <h2 className="text-2xl font-black leading-tight tracking-tight uppercase">BillCraft</h2>
        </div>
        <div className="flex gap-4">
          <ThemeToggle />
          <button className="comic-button comic-border-sm bg-white dark:bg-slate-800 p-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-black dark:text-white">notifications</span>
          </button>
          <button className="comic-button comic-border-sm bg-primary p-2 flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 space-y-8">
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-black uppercase tracking-tighter">Invoices</h1>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Manage your billing and client payments</p>
            </div>
            <button className="comic-button comic-border bg-primary text-white px-6 py-3 font-bold uppercase flex items-center gap-2 transition-colors hover:bg-blue-600">
              <span className="material-symbols-outlined">add</span>
              Create Invoice
            </button>
          </div>

          <div className="comic-border bg-white dark:bg-slate-900 p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5">
                <label className="block text-xs font-black uppercase mb-1">Search Invoices</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                  <input
                    className="w-full pl-10 comic-border-sm border-black focus:ring-primary focus:border-primary py-2 font-medium bg-transparent"
                    placeholder="Search by ID, client name..."
                    type="text"
                  />
                </div>
              </div>
              <div className="lg:col-span-4 flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-black uppercase mb-1 text-slate-500">Status</label>
                  <div className="relative h-[44px] group">
                    {/* Visual Layer - Perfectly matches Button */}
                    <div className="absolute inset-0 w-full h-full comic-button comic-border-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center px-4 transition-colors group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                      <span className="font-bold uppercase text-slate-900 dark:text-slate-100 truncate pr-6">
                        {status}
                      </span>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                        expand_more
                      </span>
                    </div>
                    {/* Overlay Layer - Real Select */}
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none z-10"
                    >
                      <option value="All Status">All Status</option>
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-black uppercase mb-1 text-slate-500">Date Range</label>
                  <div className="relative h-[44px] group">
                    {/* Visual Layer - Perfectly matches Button */}
                    <div className="absolute inset-0 w-full h-full comic-button comic-border-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center px-4 transition-colors group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                      <span className="font-bold uppercase text-slate-900 dark:text-slate-100 truncate pr-6">
                        {dateRange}
                      </span>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                        expand_more
                      </span>
                    </div>
                    {/* Overlay Layer - Real Select */}
                    <select 
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none z-10"
                    >
                      <option value="Last 30 Days">Last 30 Days</option>
                      <option value="Last 90 Days">Last 90 Days</option>
                      <option value="This Year">This Year</option>
                      <option value="Custom Range">Custom Range</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 flex items-end">
                <button className="w-full h-[44px] comic-button comic-border-sm bg-slate-100 dark:bg-slate-800 font-bold uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-xs font-black uppercase tracking-widest text-slate-500 px-4">
                  <th className="pb-2 pl-4">Invoice #</th>
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Issue Date</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv) => (
                  <tr key={inv.id} className="comic-border bg-white dark:bg-slate-900 group hover:translate-y-[-2px] transition-transform">
                    <td className="py-4 pl-4 font-black text-primary">{inv.id}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-full border-2 border-black ${inv.clientColor} overflow-hidden shrink-0`}>
                          <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                        </div>
                        <span className="font-bold">{inv.client}</span>
                      </div>
                    </td>
                    <td className="py-4 font-medium text-slate-600 dark:text-slate-400">{inv.date}</td>
                    <td className="py-4 text-right font-black text-lg">{inv.amount}</td>
                    <td className="py-4 text-center">
                      <span className={`comic-border-sm px-3 py-1 text-xs font-black uppercase ${inv.statusColor}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-4">
                      <div className="flex justify-end gap-2">
                        <button className="comic-button comic-border-sm bg-white size-9 flex items-center justify-center hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors" title="View">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        <button className="comic-button comic-border-sm bg-white size-9 flex items-center justify-center hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors" title="Download">
                          <span className="material-symbols-outlined text-sm">download</span>
                        </button>
                        <button className="comic-button comic-border-sm bg-white size-9 flex items-center justify-center hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors" title="Edit">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Showing 1 to 4 of 42 invoices</p>
            <div className="flex gap-2">
              <button className="comic-button comic-border-sm bg-white dark:bg-slate-800 px-3 py-1 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Previous</button>
              <button className="comic-button comic-border-sm bg-primary text-white px-3 py-1 font-bold text-sm hover:bg-blue-600 transition-colors">1</button>
              <button className="comic-button comic-border-sm bg-white dark:bg-slate-800 px-3 py-1 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">2</button>
              <button className="comic-button comic-border-sm bg-white dark:bg-slate-800 px-3 py-1 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Next</button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="comic-border bg-green-100 dark:bg-green-900/20 p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-green-800 dark:text-green-400">Total Paid</p>
              <h3 className="text-2xl font-black">$45,210.00</h3>
            </div>
            <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
          </div>
          <div className="comic-border bg-yellow-100 dark:bg-yellow-900/20 p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-yellow-800 dark:text-yellow-400">Total Pending</p>
              <h3 className="text-2xl font-black">$12,840.00</h3>
            </div>
            <span className="material-symbols-outlined text-4xl text-yellow-600">hourglass_empty</span>
          </div>
          <div className="comic-border bg-red-100 dark:bg-red-900/20 p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-red-800 dark:text-red-400">Total Overdue</p>
              <h3 className="text-2xl font-black">$3,150.00</h3>
            </div>
            <span className="material-symbols-outlined text-4xl text-red-600">warning</span>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t-3 border-black bg-white dark:bg-slate-900 p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">© 2023 BillCraft Invoice Engine. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
