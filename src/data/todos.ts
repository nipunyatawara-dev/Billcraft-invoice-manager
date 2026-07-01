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

export const TODO_PRIORITY_WEIGHT: Record<TodoPriority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export function compareTasksByPriorityThenOrder(a: TodoTask, b: TodoTask) {
  const priorityDiff = TODO_PRIORITY_WEIGHT[b.priority] - TODO_PRIORITY_WEIGHT[a.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return a.order - b.order || a.title.localeCompare(b.title);
}

export function sortTasksByPriorityThenOrder(tasks: TodoTask[]) {
  return [...tasks].sort(compareTasksByPriorityThenOrder);
}

/** Preserve drop order within each priority band before normalizing. */
export function assignOrdersFromColumnSequence(columnTasks: TodoTask[]) {
  const counters: Record<TodoPriority, number> = { High: 0, Medium: 0, Low: 0 };

  return columnTasks.map((task) => {
    const order = counters[task.priority];
    counters[task.priority] += 1;
    return { ...task, order };
  });
}

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
    Low: "bg-positive/12 text-positive",
    Medium: "bg-foreground/[0.06] text-foreground/60",
    High: "bg-accent/15 text-accent",
  };

  return styles[priority];
}
