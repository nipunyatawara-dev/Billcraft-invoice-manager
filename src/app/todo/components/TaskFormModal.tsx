"use client";

import * as React from "react";
import { WorkspaceFormModal } from "@/components/workspace-form-modal";
import { TODO_PRIORITIES, TODO_STAGES, type TodoPriority, type TodoStageId } from "@/data/todos";
import type { Client } from "@/data/invoices";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock,
  Layers,
  Link2,
  Minus,
  Tag,
} from "lucide-react";

export type TaskForm = {
  title: string;
  description: string;
  client: string;
  dueDate: string;
  estimate: string;
  stage: TodoStageId;
  priority: TodoPriority;
  tags: string;
};

const STAGE_STYLES: Record<TodoStageId, { text: string; bg: string; border: string; glow: string }> = {
  backlog: { text: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/30", glow: "shadow-[0_0_12px_rgba(107,114,128,0.15)]" },
  "in-progress": { text: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/30", glow: "shadow-[0_0_12px_rgba(14,165,233,0.15)]" },
  review: { text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", glow: "shadow-[0_0_12px_rgba(168,85,247,0.15)]" },
  done: { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-[0_0_12px_rgba(16,185,129,0.15)]" },
};

const PRIORITY_STYLES: Record<TodoPriority, { icon: typeof ArrowDown; text: string; bg: string; border: string; glow: string }> = {
  Low: { icon: ArrowDown, text: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/30", glow: "shadow-[0_0_12px_rgba(107,114,128,0.15)]" },
  Medium: { icon: Minus, text: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/30", glow: "shadow-[0_0_12px_rgba(6,182,212,0.15)]" },
  High: { icon: ArrowUp, text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", glow: "shadow-[0_0_12px_rgba(249,115,22,0.15)]" },
};

interface TaskFormModalProps {
  isEditing: boolean;
  form: TaskForm;
  setForm: React.Dispatch<React.SetStateAction<TaskForm>>;
  clients: Client[];
  clientMode: "select" | "custom";
  setClientMode: React.Dispatch<React.SetStateAction<"select" | "custom">>;
  isSaving: boolean;
  closeModal: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
}

export function TaskFormModal({
  isEditing,
  form,
  setForm,
  clients,
  clientMode,
  setClientMode,
  isSaving,
  closeModal,
  onSubmit,
  onDelete,
}: TaskFormModalProps) {
  const title = isEditing ? "Edit Task" : "Add Task";
  const subtitle = isEditing ? "Edit Session" : "Draft Workspace";

  const leftPanel = (
    <>
      <div className="surface-card p-4 space-y-4">
        <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
          <Layers className="size-3.5 text-muted/80" />
          Task Definition
        </h3>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="task-title">
            Title
          </label>
          <input
            id="task-title"
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="What needs to be done?"
            className="field-control px-3 py-2 text-[13px] rounded-lg"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="task-description">
            Description
          </label>
          <textarea
            id="task-description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Context details, scope notes..."
            className="field-control min-h-16 px-3 py-2 text-[13px] resize-none rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase block">Stage</label>
          <div className="grid grid-cols-2 gap-1.5">
            {TODO_STAGES.map((stage) => {
              const isSelected = form.stage === stage.id;
              const styles = STAGE_STYLES[stage.id];
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setForm({ ...form, stage: stage.id })}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-300 relative active:scale-[0.95] ${
                    isSelected
                      ? `${styles.bg} ${styles.border} ${styles.text} ${styles.glow} font-bold`
                      : "border-card-border text-muted bg-card hover:border-foreground/15 hover:text-foreground"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] mb-1">{stage.icon}</span>
                  <span className="text-[9.5px] tracking-wide font-medium truncate w-full px-1">{stage.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase block">Priority</label>
          <div className="grid grid-cols-3 gap-1.5">
            {TODO_PRIORITIES.map((p) => {
              const isSelected = form.priority === p;
              const styles = PRIORITY_STYLES[p];
              const Icon = styles.icon;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p })}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-300 relative active:scale-[0.95] ${
                    isSelected
                      ? `${styles.bg} ${styles.border} ${styles.text} ${styles.glow} font-bold`
                      : "border-card-border text-muted bg-card hover:border-foreground/15 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-[18px] mb-1" />
                  <span className="text-[9.5px] tracking-wide font-medium truncate w-full px-1">{p}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  const rightPanel = (
    <div className="surface-card p-4 space-y-4">
      <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
        <Link2 className="size-3.5 text-muted/80" />
        Relations & Constraints
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="task-client-select">
            Client Link
          </label>
          {clientMode === "select" ? (
            <div className="relative">
              <select
                id="task-client-select"
                value={form.client}
                onChange={(event) => {
                  const val = event.target.value;
                  if (val === "__custom__") {
                    setClientMode("custom");
                    setForm({ ...form, client: "" });
                  } else {
                    setForm({ ...form, client: val });
                  }
                }}
                className="field-control px-3 py-2 text-[13px] appearance-none pr-8 rounded-lg"
              >
                <option value="">General</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                <option value="__custom__">+ Add Custom...</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 size-4 text-muted pointer-events-none" />
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <input
                value={form.client}
                onChange={(event) => setForm({ ...form, client: event.target.value })}
                placeholder="Client name"
                className="field-control px-3 py-2 text-[13px] rounded-lg flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  setClientMode("select");
                  setForm({ ...form, client: "" });
                }}
                className="btn-secondary min-h-8 px-2.5 text-[11px] font-semibold rounded-lg cursor-pointer shrink-0"
              >
                Saved Clients
              </button>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="task-due">
            Due Date
          </label>
          <input
            id="task-due"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            className="field-control px-3 py-2 text-[13px] rounded-lg"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="task-estimate">
            Estimate
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 size-4 text-muted/50 pointer-events-none" />
            <input
              id="task-estimate"
              value={form.estimate}
              onChange={(event) => setForm({ ...form, estimate: event.target.value })}
              placeholder="e.g. 2h, 45m"
              className="field-control pl-9 pr-3 py-2 text-[13px] rounded-lg"
            />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="task-tags">
          Tags
        </label>
        <div className="relative">
          <Tag className="absolute left-3 top-2.5 size-4 text-muted/50 pointer-events-none" />
          <input
            id="task-tags"
            value={form.tags}
            onChange={(event) => setForm({ ...form, tags: event.target.value })}
            placeholder="Design, Scope, Revision (comma separated)"
            className="field-control pl-9 pr-3 py-2 text-[13px] rounded-lg"
          />
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceFormModal
      title={title}
      subtitle={subtitle}
      onClose={closeModal}
      onSubmit={onSubmit}
      isSaving={isSaving}
      maxWidth="4xl"
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      footerActions={{
        submitLabel: isEditing ? "Save Changes" : "Save Task",
        destructiveAction: isEditing && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={isSaving}
            className="text-[11px] font-bold text-negative hover:underline active:scale-[0.97] transition-all cursor-pointer"
          >
            Delete Task
          </button>
        ) : undefined,
      }}
    />
  );
}
