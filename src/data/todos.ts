export const TODO_STAGES = [
  {
    id: "backlog",
    label: "Backlog",
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
  dueDate?: string;
  estimate?: string;
  stage: TodoStageId;
  priority: TodoPriority;
  tags: string[];
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_TASKS: Array<Omit<TodoTask, "id" | "createdAt" | "updatedAt" | "dueDate"> & { dueOffsetDays: number }> = [
  {
    title: "Gather invoice details",
    description: "Collect scope notes, hours, and itemized costs before drafting.",
    client: "Studio admin",
    dueOffsetDays: 3,
    estimate: "30m",
    stage: "backlog",
    priority: "Medium",
    tags: ["Invoice", "Prep"],
    order: 0,
  },
  {
    title: "Confirm payment terms",
    description: "Check due date, tax handling, and preferred currency.",
    client: "New client",
    dueOffsetDays: 4,
    estimate: "20m",
    stage: "backlog",
    priority: "Low",
    tags: ["Client"],
    order: 1,
  },
  {
    title: "Draft monthly retainer invoice",
    description: "Build line items and attach any supporting notes.",
    client: "Retainer work",
    dueOffsetDays: 1,
    estimate: "45m",
    stage: "in-progress",
    priority: "High",
    tags: ["Invoice"],
    order: 0,
  },
  {
    title: "Review outsourcing payout",
    description: "Verify vendor totals before marking the bill ready.",
    client: "Vendor payout",
    dueOffsetDays: 2,
    estimate: "25m",
    stage: "review",
    priority: "Medium",
    tags: ["Outsourcing"],
    order: 0,
  },
  {
    title: "Archive paid invoice note",
    description: "Keep final payment confirmation with the profile records.",
    client: "Bookkeeping",
    dueOffsetDays: 0,
    estimate: "10m",
    stage: "done",
    priority: "Low",
    tags: ["Admin"],
    order: 0,
  },
];

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function createDefaultTodoTasks() {
  const now = new Date().toISOString();

  return DEFAULT_TASKS.map((task, index): TodoTask => {
    const { dueOffsetDays, ...todoTask } = task;

    return {
      ...todoTask,
      id: `todo-${Date.now().toString(36)}-${index}`,
      dueDate: getDateOffset(dueOffsetDays),
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function getTodoPriorityStyles(priority: TodoPriority) {
  const styles: Record<TodoPriority, string> = {
    Low: "bg-[var(--positive)]/12 text-[var(--positive)]",
    Medium: "bg-[var(--foreground)]/[0.06] text-[var(--foreground)]/60",
    High: "bg-[var(--accent)]/15 text-[var(--accent)]",
  };

  return styles[priority];
}
