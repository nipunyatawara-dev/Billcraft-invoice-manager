import { sortTasksByPriorityThenOrder, TODO_STAGES, type TodoStageId, type TodoTask } from "@/data/todos";
import type { TaskForm } from "./components/TaskFormModal";
import type { DragEvent } from "react";

const DUE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function createTaskId() {
  return `todo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function sortByOrder(tasks: TodoTask[]) {
  return sortTasksByPriorityThenOrder(tasks);
}

export function getStageTasks(tasks: TodoTask[], stage: TodoStageId) {
  return sortByOrder(tasks.filter((task) => task.stage === stage));
}

export function normalizeStageOrder(tasks: TodoTask[]) {
  return TODO_STAGES.flatMap((stage) => {
    const stageTasks = getStageTasks(tasks, stage.id);
    return stageTasks.map((task, index) => ({ ...task, order: index }));
  });
}

export function formatDueDate(dueDate?: string) {
  if (!dueDate) {
    return "No due date";
  }

  const parsed = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return dueDate;
  }

  return DUE_DATE_FORMATTER.format(parsed);
}

export function getDueTone(dueDate?: string, stage?: TodoStageId) {
  if (!dueDate || stage === "done") {
    return "text-muted";
  }

  const today = new Date(todayInputValue());
  const due = new Date(`${dueDate}T00:00:00`);
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / 86400000);

  if (daysUntilDue < 0) {
    return "text-accent";
  }

  if (daysUntilDue <= 2) {
    return "text-foreground";
  }

  return "text-muted";
}

export function getWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");

  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "";
}

export function getTaskDoneMessage(task: TodoTask) {
  return `Hi ${task.client || "there"}, ${task.invoiceId ? `${task.invoiceId} ` : ""}${task.title} is done.`;
}

export function getTagList(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function getFormFromTask(task: TodoTask): TaskForm {
  return {
    title: task.title,
    description: task.description || "",
    client: task.client || "",
    dueDate: task.dueDate || "",
    estimate: task.estimate || "",
    stage: task.stage,
    priority: task.priority,
    tags: task.tags.join(", "),
  };
}

export function getTaskInsertionTarget(
  event: DragEvent<HTMLDivElement>,
  orderedTasks: TodoTask[],
  taskId: string,
  draggedTaskId?: string | null,
) {
  const visibleTasks = draggedTaskId ? orderedTasks.filter((task) => task.id !== draggedTaskId) : orderedTasks;
  const currentIndex = visibleTasks.findIndex((task) => task.id === taskId);

  if (currentIndex === -1) {
    return null;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const isAfterCardMidpoint = event.clientY > rect.top + rect.height / 2;

  return isAfterCardMidpoint ? visibleTasks[currentIndex + 1]?.id || null : taskId;
}
