import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notifyPromise } from "@/lib/toast";
import { AnimatedText } from "@/components/animated-text";

export function TrashTab() {
  const { trash, restoreInvoices, emptyTrash } = useUserData();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      
      {/* Trash Bin Header */}
      <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-3xl group">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <div className="size-16 sm:size-20 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[32px] sm:text-[40px]">delete</span>
          </div>
          <div className="text-center sm:text-left">
            <AnimatedText as="p" text="System Storage" effect="micro-scale-fade" className="text-[11px] font-bold text-featured-text/50 tracking-widest uppercase mb-2" />
            <AnimatedText
              as="h2"
              text="Trash Bin"
              effect="micro-scale-fade"
              className="text-2xl sm:text-3xl font-bold text-featured-text font-display mb-2 tracking-tight"
              delayMs={70}
            />
            <p className="text-[14px] text-featured-text/70 font-medium max-w-xl">
              Recover soft-deleted invoices or permanently wipe them to free up profile slot space.
            </p>
          </div>
        </div>
      </div>

      {/* Wipe Deleted Items Card */}
      <div className="surface-card p-6 rounded-3xl shadow-sm relative overflow-hidden group border border-card-border hover:border-red-500/20 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative z-10">
          <div>
            <h3 className="text-[16px] font-bold text-foreground tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-red-500">auto_delete</span>
              Wipe Deleted Items
            </h3>
            <p className="text-[13px] text-muted mt-1">
              Wiping the trash permanently destroys all deleted items across this profile.
            </p>
          </div>
          {trash.length > 0 ? (
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to permanently delete all items in the Trash Bin? This action cannot be undone.")) {
                  await notifyPromise(emptyTrash(), {
                    loading: { title: "Emptying trash...", description: "Wiping deleted items." },
                    success: { title: "Trash emptied", description: "All deleted invoices were permanently removed." },
                    error: (e) => ({ title: "Wipe failed", description: getToastErrorMessage(e, "Unable to empty trash.") })
                  });
                }
              }}
              className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[13px] font-bold text-red-500 hover:bg-red-500 hover:text-white active:scale-95 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
              Empty Trash Bin
            </button>
          ) : (
            <div className="px-5 py-2.5 bg-foreground/[0.03] rounded-xl text-[13px] font-bold text-muted/50 flex items-center gap-2 select-none border border-card-border/50">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Trash is Empty
            </div>
          )}
        </div>
      </div>

      {/* Trash Items List */}
      <div className="space-y-3">
        {trash.length > 0 ? (
          trash.map((item) => (
            <div
              key={item.id}
              className="surface-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-card-border hover:border-action/30 hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-xl bg-foreground/[0.03] flex items-center justify-center shrink-0 border border-card-border group-hover:bg-action/5 group-hover:text-action transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-muted group-hover:text-action">receipt_long</span>
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-foreground tracking-tight">{item.data.client}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-muted">
                    <span className="uppercase tracking-wider">Invoice</span>
                    <span className="size-1 rounded-full bg-muted/40"></span>
                    <span>{item.data.date}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  await notifyPromise(restoreInvoices([item.id]), {
                    loading: { title: "Restoring...", description: "Moving item back to active invoices." },
                    success: { title: "Item restored", description: "The invoice is active again." },
                    error: (e) => ({ title: "Restore failed", description: getToastErrorMessage(e, "Unable to restore item.") })
                  });
                }}
                className="w-full sm:w-auto px-4 py-2 border border-card-border rounded-xl text-[12px] font-bold text-foreground hover:bg-action hover:text-action-text hover:border-transparent active:scale-95 transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">restore</span>
                Restore
              </button>
            </div>
          ))
        ) : (
          <div className="surface-card p-12 rounded-3xl flex flex-col items-center justify-center text-center border border-dashed border-card-border bg-background/50">
            <div className="size-20 rounded-full bg-foreground/[0.02] flex items-center justify-center mb-4 border border-card-border shadow-inner">
              <span className="material-symbols-outlined text-[32px] text-muted/40">auto_delete</span>
            </div>
            <p className="text-[15px] font-bold text-foreground mb-1">Your trash bin is empty</p>
            <p className="text-[12px] text-muted max-w-xs">Items you delete will show up here. You can restore them or permanently wipe them later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
