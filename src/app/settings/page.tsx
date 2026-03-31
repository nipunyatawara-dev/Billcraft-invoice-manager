"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { useState } from "react";

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  return (
    <DashboardLayout>
      <main className="flex-1 max-w-[800px] mx-auto w-full p-6 lg:p-10 space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your profile and application preferences.</p>
        </div>

        <div className="space-y-6">
          <section className="bg-white dark:bg-[#111827] p-6 lg:p-8 rounded-xl shadow-sm shadow-black/5 border border-slate-200/60 dark:border-slate-800/60 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Profile Information</h2>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/60">
              <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0 overflow-hidden relative group">
                <span className="material-symbols-outlined text-3xl text-slate-400">person</span>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                   <span className="material-symbols-outlined text-xl">photo_camera</span>
                </div>
              </div>
              <div>
                <button className="px-4 py-2 bg-white dark:bg-[#1f2937] border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm mb-2 text-slate-700 dark:text-slate-300">
                  Change Avatar
                </button>
                <p className="text-xs text-slate-500">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
                <input type="text" defaultValue="John" className="w-full px-4 border border-slate-200/60 dark:border-slate-700/60 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary py-2.5 text-sm bg-slate-50 dark:bg-[#1f2937] outline-none transition-all dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                <input type="text" defaultValue="Doe" className="w-full px-4 border border-slate-200/60 dark:border-slate-700/60 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary py-2.5 text-sm bg-slate-50 dark:bg-[#1f2937] outline-none transition-all dark:text-white" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <input type="email" defaultValue="hello@johndoe.com" className="w-full px-4 border border-slate-200/60 dark:border-slate-700/60 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary py-2.5 text-sm bg-slate-50 dark:bg-[#1f2937] outline-none transition-all dark:text-white" />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-[#111827] p-6 lg:p-8 rounded-xl shadow-sm shadow-black/5 border border-slate-200/60 dark:border-slate-800/60 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notifications</h2>
            
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800/60 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Email Notifications</h3>
                  <p className="text-xs text-slate-500 mt-1">Receive alerts when invoices are fully paid or overdue.</p>
                </div>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={emailNotifications}
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${emailNotifications ? 'bg-green-500' : 'bg-slate-200 dark:bg-[#1f2937]'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${emailNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800/60 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Marketing Emails</h3>
                  <p className="text-xs text-slate-500 mt-1">Receive promotional emails, feature updates and reports.</p>
                </div>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={marketingEmails}
                  onClick={() => setMarketingEmails(!marketingEmails)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${marketingEmails ? 'bg-green-500' : 'bg-slate-200 dark:bg-[#1f2937]'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${marketingEmails ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 pt-6 pb-12">
          <button className="px-5 py-2.5 bg-white dark:bg-[#1f2937] border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
            Cancel
          </button>
          <button className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all shadow-sm active:scale-95">
            Save Changes
          </button>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200/60 dark:border-slate-800/60 bg-transparent p-6 text-center">
        <p className="text-[13px] font-medium text-slate-500">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </DashboardLayout>
  );
}
