import { useState } from "react";
import { TOAST_POSITIONS, type ToastPosition, useToastPosition } from "@/hooks/use-toast-position";
import { notify } from "@/lib/toast";
import { AnimatedText } from "@/components/animated-text";
import { BellRing, Layout, ArrowUpRight, ArrowUp, ArrowUpLeft, ArrowDownLeft, ArrowDown, ArrowDownRight, Bell } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  north_east: ArrowUpRight,
  north: ArrowUp,
  north_west: ArrowUpLeft,
  south_west: ArrowDownLeft,
  south: ArrowDown,
  south_east: ArrowDownRight,
};

export function NotificationsTab() {
  const { toastPosition, setToastPosition } = useToastPosition();
  const [invoiceReminders, setInvoiceReminders] = useState(true);

  function selectToastPosition(position: ToastPosition, label: string) {
    setToastPosition(position);
    notify.info({
      title: "Toast position updated",
      description: `Notifications will appear at ${label.toLowerCase()}.`,
      position,
    });
  }

  function togglePreference(label: string, currentValue: boolean, toggle: (nextValue: boolean) => void) {
    const nextValue = !currentValue;
    toggle(nextValue);
    notify.info({
      title: `${label} ${nextValue ? "enabled" : "disabled"}`,
      description: nextValue ? "This notification preference is now active." : "This notification preference is now off.",
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      
      {/* Notifications Intro */}
      <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-xl group">
        <div className="absolute inset-0 bg-gradient-to-r from-action/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex flex-col sm:flex-row items-start gap-4 relative z-10">
          <div>
            <AnimatedText
              as="h2"
              text="Notification Preferences"
              effect="micro-scale-fade"
              className="text-2xl font-bold text-featured-text font-display mb-2 tracking-tight"
              delayMs={70}
            />
            <p className="text-[14px] text-featured-text/70 font-medium">Control where alerts appear and what events trigger a notification.</p>
          </div>
        </div>
      </div>

      <div className="surface-card p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-[16px] font-bold text-foreground tracking-tight flex items-center gap-2">
              Toast Position
            </h3>
            <p className="text-[13px] text-muted mt-1">Choose where app notifications appear on your screen.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Toast position">
          {TOAST_POSITIONS.map((position) => {
            const isSelected = toastPosition === position.id;

            return (
              <button
                key={position.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => selectToastPosition(position.id, position.label)}
                className={`flex min-h-14 items-center justify-center gap-2.5 rounded-xl border-2 px-4 text-[13px] font-bold transition-all duration-300 active:scale-95 group ${
                  isSelected
                    ? "border-action bg-action/10 text-action shadow-sm"
                    : "border-card-border bg-background/50 text-muted hover:border-accent/50 hover:text-foreground hover:bg-foreground/[0.02]"
                }`}
              >
                {(() => {
                  const IconComp = iconMap[position.icon] || Bell;
                  return <IconComp className={`size-5 transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`} />;
                })()}
                {position.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="surface-card rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="p-6 border-b border-card-border bg-foreground/[0.01]">
          <h3 className="text-[16px] font-bold text-foreground tracking-tight flex items-center gap-2">
            System Alerts
          </h3>
          <p className="text-[13px] text-muted mt-1">Manage automated alerts sent by BillCraft.</p>
        </div>
        
        <div className="divide-y divide-card-border">
          {[
            { label: "Invoice Reminders", desc: "Auto-send reminders for unpaid invoices nearing their due date.", state: invoiceReminders, toggle: setInvoiceReminders, icon: Bell },
            // Could add more toggles here easily in the future
          ].map((item) => (
            <div key={item.label} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4 hover:bg-foreground/[0.02] transition-colors">
              <div className="flex gap-4 items-start">
                <div className="size-10 rounded-full bg-foreground/[0.05] flex items-center justify-center shrink-0">
                  <item.icon className="size-5 text-muted" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-foreground mb-1">{item.label}</h4>
                  <p className="text-[12px] text-muted max-w-sm">{item.desc}</p>
                </div>
              </div>
              <button 
                type="button"
                role="switch"
                aria-checked={item.state}
                onClick={() => togglePreference(item.label, item.state, item.toggle)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-all duration-300 ease-in-out border-2 border-transparent shadow-inner focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 ${
                  item.state 
                    ? 'bg-accent' 
                    : 'bg-black/20 dark:bg-white/20 hover:bg-black/30 dark:hover:bg-white/30'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out mt-0.5 ${item.state ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
