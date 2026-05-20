export const TODO_STAGES = [
  {
    id: "backlog",
    label: "Tasks",
    icon: "inventory_2",
  },
  {
    id: "in-progress",
    label: "In Progress",
    icon: "hourglass_top",
  },
  {
    id: "review",
    label: "Review",
    icon: "rate_review",
  },
  {
    id: "done",
    label: "Done",
    icon: "task_alt",
  },
] as const;

export const TODO_PRIORITIES = ["Low", "Medium", "High"] as const;

export type TodoStageId = (typeof TODO_STAGES)[number]["id"];
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

export interface TodoTask {
  id: string;
  title: string;
  description?: string;
  client?: string;
  clientId?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  invoiceId?: string;
  jobColor?: string;
  deliveryLink?: string;
  dueDate?: string;
  estimate?: string;
  stage: TodoStageId;
  priority: TodoPriority;
  tags: string[];
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export function createDefaultTodoTasks(): TodoTask[] {
  return [];
}

export function getTodoPriorityStyles(priority: TodoPriority) {
  const styles: Record<TodoPriority, string> = {
    Low: "bg-[var(--positive)]/12 text-[var(--positive)]",
    Medium: "bg-[var(--foreground)]/[0.06] text-[var(--foreground)]/60",
    High: "bg-[var(--accent)]/15 text-[var(--accent)]",
  };

  return styles[priority];
}
