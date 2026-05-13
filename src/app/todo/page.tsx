"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { TODO_PRIORITIES, TODO_STAGES, getTodoPriorityStyles, type TodoPriority, type TodoStageId, type TodoTask } from "@/data/todos";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";

type TaskForm = {
  title: string;
  description: string;
  client: string;
  dueDate: string;
  estimate: string;
  stage: TodoStageId;
  priority: TodoPriority;
  tags: string;
};

type DragTarget = {
  stage: TodoStageId;
  beforeTaskId: string | null;
} | null;

type UndoSnapshot = {
  tasks: TodoTask[];
  label: string;
};

const UNDO_TIMEOUT_MS = 6000;

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  client: "",
  dueDate: "",
  estimate: "",
  stage: "backlog",
  priority: "Medium",
  tags: "",
};

const DUE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function createTaskId() {
  return `todo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function sortByOrder(tasks: TodoTask[]) {
  return [...tasks].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function getStageTasks(tasks: TodoTask[], stage: TodoStageId) {
  return sortByOrder(tasks.filter((task) => task.stage === stage));
}

function normalizeStageOrder(tasks: TodoTask[]) {
  return TODO_STAGES.flatMap((stage) => (
    getStageTasks(tasks, stage.id).map((task, index) => ({ ...task, order: index }))
  ));
}

function formatDueDate(dueDate?: string) {
  if (!dueDate) {
    return "No due date";
  }

  const parsed = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return dueDate;
  }

  return DUE_DATE_FORMATTER.format(parsed);
}

function getDueTone(dueDate?: string, stage?: TodoStageId) {
  if (!dueDate || stage === "done") {
    return "text-[var(--muted)]";
  }

  const today = new Date(todayInputValue());
  const due = new Date(`${dueDate}T00:00:00`);
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / 86400000);

  if (daysUntilDue < 0) {
    return "text-[var(--accent)]";
  }

  if (daysUntilDue <= 2) {
    return "text-[var(--foreground)]";
  }

  return "text-[var(--muted)]";
}

function getTagList(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function getFormFromTask(task: TodoTask): TaskForm {
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

function getTaskInsertionTarget(
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

export default function TodoPage() {
  const { activeProfile, loading, todoTasks, saveTodoTasks } = useUserData();
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const didDragRef = useRef(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTasks(normalizeStageOrder(todoTasks));
  }, [todoTasks]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  function stashUndo(previousTasks: TodoTask[], label: string) {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    setUndoSnapshot({ tasks: previousTasks, label });
    undoTimerRef.current = setTimeout(() => {
      setUndoSnapshot(null);
      undoTimerRef.current = null;
    }, UNDO_TIMEOUT_MS);
  }

  function clearUndo() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    setUndoSnapshot(null);
  }

  async function handleUndo() {
    if (!undoSnapshot || isSaving) {
      return;
    }

    const restoredTasks = undoSnapshot.tasks;
    const previousTasks = tasks;

    clearUndo();
    setIsSaving(true);
    setTasks(restoredTasks);

    try {
      await notifyPromise(saveTodoTasks(restoredTasks), {
        loading: {
          title: "Restoring...",
          description: "Bringing back your tasks.",
        },
        success: {
          title: "Restored",
          description: "Your board was restored.",
        },
        error: (error) => ({
          title: "Restore failed",
          description: getToastErrorMessage(error, "Unable to undo."),
        }),
      });
    } catch {
      setTasks(previousTasks);
    } finally {
      setIsSaving(false);
    }
  }

  const stats = useMemo(() => {
    const today = new Date(todayInputValue());
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 3);

    return {
      active: tasks.filter((task) => task.stage !== "done").length,
      inProgress: tasks.filter((task) => task.stage === "in-progress").length,
      dueSoon: tasks.filter((task) => {
        if (!task.dueDate || task.stage === "done") {
          return false;
        }

        const due = new Date(`${task.dueDate}T00:00:00`);
        return due <= soon;
      }).length,
      completed: tasks.filter((task) => task.stage === "done").length,
    };
  }, [tasks]);

  async function persistBoard(nextTasks: TodoTask[], previousTasks: TodoTask[]) {
    setTasks(nextTasks);

    try {
      await saveTodoTasks(nextTasks);
    } catch (error) {
      setTasks(previousTasks);
      notify.error({
        title: "Board update failed",
        description: getToastErrorMessage(error, "Unable to save this task move."),
      });
    }
  }

  function openCreateModal(stage: TodoStageId = "backlog") {
    setEditingTaskId(null);
    setForm({ ...EMPTY_FORM, stage, dueDate: todayInputValue() });
    setIsTaskModalOpen(true);
  }

  function openEditModal(task: TodoTask) {
    setEditingTaskId(task.id);
    setForm(getFormFromTask(task));
    setIsTaskModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsTaskModalOpen(false);
    setEditingTaskId(null);
    setForm(EMPTY_FORM);
  }

  function moveTask(taskId: string, targetStage: TodoStageId, beforeTaskId: string | null) {
    const movingTask = tasks.find((task) => task.id === taskId);

    if (!movingTask) {
      return;
    }

    const previousTasks = tasks;
    const remainingTasks = tasks.filter((task) => task.id !== taskId);
    const targetColumn = getStageTasks(remainingTasks, targetStage);
    const insertIndex = beforeTaskId ? Math.max(targetColumn.findIndex((task) => task.id === beforeTaskId), 0) : targetColumn.length;
    const nextColumn = [
      ...targetColumn.slice(0, insertIndex),
      { ...movingTask, stage: targetStage, updatedAt: new Date().toISOString() },
      ...targetColumn.slice(insertIndex),
    ];
    const nextTasks = normalizeStageOrder([
      ...remainingTasks.filter((task) => task.stage !== targetStage),
      ...nextColumn,
    ]);

    void persistBoard(nextTasks, previousTasks);
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, taskId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
    setDraggingTaskId(taskId);
  }

  function handleTaskDragOver(event: DragEvent<HTMLDivElement>, stage: TodoStageId, taskId: string) {
    event.preventDefault();
    const orderedTasks = getStageTasks(tasks, stage);
    setDragTarget({
      stage,
      beforeTaskId: getTaskInsertionTarget(event, orderedTasks, taskId, draggingTaskId),
    });
  }

  function handleTaskDrop(event: DragEvent<HTMLDivElement>, stage: TodoStageId, taskId: string) {
    event.preventDefault();
    event.stopPropagation();
    const draggedTaskId = event.dataTransfer.getData("text/plain") || draggingTaskId;

    if (!draggedTaskId || draggedTaskId === taskId) {
      setDraggingTaskId(null);
      setDragTarget(null);
      return;
    }

    const orderedTasks = getStageTasks(tasks, stage);
    moveTask(draggedTaskId, stage, getTaskInsertionTarget(event, orderedTasks, taskId, draggedTaskId));
    setDraggingTaskId(null);
    setDragTarget(null);
  }

  function handleColumnDrop(event: DragEvent<HTMLElement>, stage: TodoStageId) {
    event.preventDefault();
    const draggedTaskId = event.dataTransfer.getData("text/plain") || draggingTaskId;

    if (draggedTaskId) {
      moveTask(draggedTaskId, stage, null);
    }

    setDraggingTaskId(null);
    setDragTarget(null);
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeProfile) {
      notify.warning({
        title: "Profile required",
        description: "Create a profile before saving tasks.",
      });
      return;
    }

    const title = form.title.trim();

    if (!title) {
      notify.warning({
        title: "Task title required",
        description: "Add a title before saving this task.",
      });
      return;
    }

    const now = new Date().toISOString();
    const previousTasks = tasks;
    const existingTask = editingTaskId ? tasks.find((task) => task.id === editingTaskId) : null;
    const stageTasks = getStageTasks(tasks, form.stage);
    const nextTask: TodoTask = {
      id: existingTask?.id || createTaskId(),
      title,
      description: form.description.trim() || undefined,
      client: form.client.trim() || undefined,
      dueDate: form.dueDate || undefined,
      estimate: form.estimate.trim() || undefined,
      stage: form.stage,
      priority: form.priority,
      tags: getTagList(form.tags),
      order: existingTask?.stage === form.stage ? existingTask.order : stageTasks.length,
      createdAt: existingTask?.createdAt || now,
      updatedAt: now,
    };
    const nextTasks = normalizeStageOrder(existingTask
      ? tasks.map((task) => task.id === existingTask.id ? nextTask : task)
      : [nextTask, ...tasks]);

    setIsSaving(true);
    setTasks(nextTasks);

    try {
      await notifyPromise(saveTodoTasks(nextTasks), {
        loading: {
          title: existingTask ? "Updating task..." : "Creating task...",
          description: "Saving this board to your profile.",
        },
        success: {
          title: existingTask ? "Task updated" : "Task created",
          description: `${nextTask.title} is on the board.`,
        },
        error: (error) => ({
          title: "Task save failed",
          description: getToastErrorMessage(error, "Unable to save this task."),
        }),
      });
      closeModal();
    } catch {
      setTasks(previousTasks);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTask(taskId: string) {
    const task = tasks.find((currentTask) => currentTask.id === taskId);

    if (!task || isSaving) {
      return;
    }

    const previousTasks = tasks;
    const nextTasks = normalizeStageOrder(tasks.filter((currentTask) => currentTask.id !== taskId));

    setIsSaving(true);
    setTasks(nextTasks);

    try {
      await notifyPromise(saveTodoTasks(nextTasks), {
        loading: {
          title: "Deleting task...",
          description: "Updating your board.",
        },
        success: {
          title: "Task deleted",
          description: `${task.title} was removed.`,
        },
        error: (error) => ({
          title: "Delete failed",
          description: getToastErrorMessage(error, "Unable to delete this task."),
        }),
      });
      stashUndo(previousTasks, task.title);
      closeModal();
    } catch {
      setTasks(previousTasks);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTasks(taskIds: string[]) {
    if (taskIds.length === 0 || isSaving) {
      return;
    }

    const idsToDelete = new Set(taskIds);
    const deletedTasks = tasks.filter((task) => idsToDelete.has(task.id));

    if (deletedTasks.length === 0) {
      return;
    }

    const previousTasks = tasks;
    const nextTasks = normalizeStageOrder(tasks.filter((task) => !idsToDelete.has(task.id)));

    setIsSaving(true);
    setTasks(nextTasks);
    setSelectedTaskIds(new Set());

    try {
      const label = deletedTasks.length === 1 ? deletedTasks[0].title : `${deletedTasks.length} tasks`;

      await notifyPromise(saveTodoTasks(nextTasks), {
        loading: {
          title: "Deleting...",
          description: `Removing ${label} from the board.`,
        },
        success: {
          title: "Deleted",
          description: `${label} removed.`,
        },
        error: (error) => ({
          title: "Delete failed",
          description: getToastErrorMessage(error, "Unable to delete."),
        }),
      });
      stashUndo(previousTasks, label);
    } catch {
      setTasks(previousTasks);
    } finally {
      setIsSaving(false);
    }
  }

  function toggleSelectTask(taskId: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);

      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }

      return next;
    });
  }

  function handleTrashDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const draggedTaskId = event.dataTransfer.getData("text/plain") || draggingTaskId;

    if (draggedTaskId) {
      void deleteTasks([draggedTaskId]);
    }

    setDraggingTaskId(null);
    setDragTarget(null);
    setIsTrashHovered(false);
  }

  function handleTrashClick() {
    if (selectedTaskIds.size > 0) {
      void deleteTasks(Array.from(selectedTaskIds));
    }
  }

  const showTrashZone = draggingTaskId !== null || selectedTaskIds.size > 0;

  return (
    <>
      <main className="app-main flex-1">
        <div className="page-heading">
          <div>
            <p className="section-eyebrow">Workspace</p>
            <h1 className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]">
              To-Do
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {undoSnapshot && !draggingTaskId && (
              <button
                onClick={() => void handleUndo()}
                disabled={isSaving}
                className="undo-btn"
                aria-label={`Undo delete of ${undoSnapshot.label}`}
                title={`Undo — restore ${undoSnapshot.label}`}
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
                <span className="text-[12px] font-semibold">Undo</span>
              </button>
            )}
            {showTrashZone && (
              <button
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setIsTrashHovered(true);
                }}
                onDragLeave={() => setIsTrashHovered(false)}
                onDrop={handleTrashDrop}
                onClick={handleTrashClick}
                disabled={isSaving}
                className={`trash-zone-btn ${
                  draggingTaskId ? "trash-zone-btn--dragging" : ""
                } ${
                  isTrashHovered && draggingTaskId ? "trash-zone-btn--drag-hover" : ""
                } ${selectedTaskIds.size > 0 && !draggingTaskId ? "trash-zone-btn--has-selection" : ""}`}
                aria-label={selectedTaskIds.size > 0 ? `Delete ${selectedTaskIds.size} selected` : "Drop here to delete"}
                title={selectedTaskIds.size > 0 ? `Delete ${selectedTaskIds.size} selected` : "Drop here to delete"}
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                {draggingTaskId ? (
                  <span className="text-[12px] font-semibold tracking-wide">Drop to delete</span>
                ) : selectedTaskIds.size > 0 ? (
                  <span className="text-[13px] font-semibold">{selectedTaskIds.size}</span>
                ) : null}
              </button>
            )}
            <button onClick={() => openCreateModal()} className="btn-primary active:scale-[0.97]">
              <span className="material-symbols-outlined text-[16px]">add_task</span>
              Add Task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="surface-featured p-4 relative overflow-hidden">
            <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Active Tasks</p>
            <p className="text-xl font-semibold text-[var(--featured-text)] font-display"><AnimatedNumber value={stats.active} /> <span className="text-[12px] font-normal text-[var(--featured-muted)]">open</span></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">In Progress</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={stats.inProgress} /> <span className="text-[12px] font-normal text-[var(--muted)]">moving</span></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Due Soon</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={stats.dueSoon} /> <span className="text-[12px] font-normal text-[var(--accent)]">watch</span></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Completed</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={stats.completed} /> <span className="text-[12px] font-normal text-[var(--positive)]">done</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
          {TODO_STAGES.map((stage) => {
            const stageTasks = getStageTasks(tasks, stage.id);
            const isColumnTarget = dragTarget?.stage === stage.id && dragTarget.beforeTaskId === null;

            return (
              <section
                key={stage.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (event.currentTarget === event.target) {
                    setDragTarget({ stage: stage.id, beforeTaskId: null });
                  }
                }}
                onDrop={(event) => handleColumnDrop(event, stage.id)}
                className={`surface-card p-3 min-h-[320px] md:min-h-[520px] flex flex-col transition-smooth ${
                  isColumnTarget ? "border-[var(--accent)]/50 bg-[var(--foreground)]/[0.03]" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-[var(--foreground)]/[0.04] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">{stage.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[13px] font-semibold text-[var(--foreground)] truncate">{stage.label}</h2>
                      <p className="text-[10px] font-semibold text-[var(--foreground)]/25 tracking-wide uppercase"><AnimatedNumber value={stageTasks.length} /> cards</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openCreateModal(stage.id)}
                    className="size-7 rounded-lg flex items-center justify-center text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth"
                    aria-label={`Add task to ${stage.label}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>

                <div className="space-y-2.5 flex-1">
                  {loading && stageTasks.length === 0 ? (
                    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--foreground)]/[0.03] p-4">
                      <div className="h-3 w-24 rounded-full bg-[var(--foreground)]/10 mb-3" />
                      <div className="h-2 w-full rounded-full bg-[var(--foreground)]/10 mb-2" />
                      <div className="h-2 w-2/3 rounded-full bg-[var(--foreground)]/10" />
                    </div>
                  ) : stageTasks.length > 0 ? (
                    stageTasks.map((task) => {
                      const isDragging = draggingTaskId === task.id;
                      const isBeforeTarget = dragTarget?.stage === stage.id && dragTarget.beforeTaskId === task.id;
                      const isSelected = selectedTaskIds.has(task.id);

                      return (
                        <div key={task.id} className="relative">
                          {isBeforeTarget && <div className="absolute -top-1 left-0 right-0 h-0.5 rounded-full bg-[var(--accent)]" />}
                          <div
                            draggable
                            onDragStart={(event) => {
                              didDragRef.current = true;
                              handleDragStart(event, task.id);
                            }}
                            onDragOver={(event) => handleTaskDragOver(event, stage.id, task.id)}
                            onDrop={(event) => handleTaskDrop(event, stage.id, task.id)}
                            onDragEnd={() => {
                              setDraggingTaskId(null);
                              setDragTarget(null);
                              setIsTrashHovered(false);
                              setTimeout(() => { didDragRef.current = false; }, 0);
                            }}
                            onClick={() => {
                              if (!didDragRef.current) {
                                toggleSelectTask(task.id);
                              }
                            }}
                            className={`rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-smooth hover:-translate-y-0.5 ${
                              isDragging ? "opacity-50 scale-[0.98] border-[var(--card-border)]" : ""
                            } ${
                              isSelected
                                ? "border-[var(--accent)] bg-[var(--accent)]/[0.04] ring-1 ring-[var(--accent)]/30"
                                : "border-[var(--card-border)] bg-[var(--background)]/45 hover:border-[var(--foreground)]/15"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase ${getTodoPriorityStyles(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                  {task.tags.slice(0, 2).map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 rounded-md bg-[var(--foreground)]/[0.04] text-[10px] font-semibold text-[var(--muted)] tracking-wide uppercase">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <h3 className="text-[14px] font-semibold text-[var(--foreground)] leading-snug">{task.title}</h3>
                              </div>
                              <button
                                onClick={() => openEditModal(task)}
                                className="size-7 flex items-center justify-center rounded-lg text-[var(--foreground)]/20 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth shrink-0"
                                aria-label={`Edit ${task.title}`}
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                            </div>

                            {task.description && (
                              <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">{task.description}</p>
                            )}

                            <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-medium">
                              <span className="inline-flex items-center gap-1 text-[var(--muted)] min-w-0">
                                <span className="material-symbols-outlined text-[14px]">business_center</span>
                                <span className="truncate">{task.client || "General"}</span>
                              </span>
                              <span className={`inline-flex items-center gap-1 ${getDueTone(task.dueDate, task.stage)}`}>
                                <span className="material-symbols-outlined text-[14px]">event</span>
                                {formatDueDate(task.dueDate)}
                              </span>
                              {task.estimate && (
                                <span className="inline-flex items-center gap-1 text-[var(--muted)]">
                                  <span className="material-symbols-outlined text-[14px]">timer</span>
                                  {task.estimate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <button
                      onClick={() => openCreateModal(stage.id)}
                      className="w-full min-h-[160px] rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--foreground)]/[0.02] flex flex-col items-center justify-center text-center p-5 transition-smooth hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
                    >
                      <span className="material-symbols-outlined text-[30px] text-[var(--foreground)]/12 mb-2">add_task</span>
                      <span className="text-[12px] font-semibold text-[var(--muted)]">Add a card</span>
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            aria-label="Close task editor"
            className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm"
            onClick={closeModal}
          />
          <form onSubmit={handleTaskSubmit} className="modal-surface relative max-w-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="section-eyebrow">{editingTaskId ? "Edit" : "Create"}</p>
                <h2 className="text-2xl font-semibold text-[var(--foreground)] font-display">
                  {editingTaskId ? "Update task" : "New task"}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="task-title">Title</label>
                <input
                  id="task-title"
                  required
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Task title"
                  className="field-control px-3 py-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="task-description">Description</label>
                <textarea
                  id="task-description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Notes, scope, or next step"
                  rows={3}
                  className="field-control px-3 py-2 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="task-stage">Stage</label>
                  <select
                    id="task-stage"
                    value={form.stage}
                    onChange={(event) => setForm({ ...form, stage: event.target.value as TodoStageId })}
                    className="field-control px-3 py-2"
                  >
                    {TODO_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="task-priority">Priority</label>
                  <select
                    id="task-priority"
                    value={form.priority}
                    onChange={(event) => setForm({ ...form, priority: event.target.value as TodoPriority })}
                    className="field-control px-3 py-2"
                  >
                    {TODO_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="task-client">Client</label>
                  <input
                    id="task-client"
                    value={form.client}
                    onChange={(event) => setForm({ ...form, client: event.target.value })}
                    placeholder="General"
                    className="field-control px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="task-due">Due</label>
                  <input
                    id="task-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                    className="field-control px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="task-estimate">Estimate</label>
                  <input
                    id="task-estimate"
                    value={form.estimate}
                    onChange={(event) => setForm({ ...form, estimate: event.target.value })}
                    placeholder="30m"
                    className="field-control px-3 py-2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="task-tags">Tags</label>
                <input
                  id="task-tags"
                  value={form.tags}
                  onChange={(event) => setForm({ ...form, tags: event.target.value })}
                  placeholder="Invoice, Client"
                  className="field-control px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-5">
              {editingTaskId ? (
                <button
                  type="button"
                  onClick={() => void deleteTask(editingTaskId)}
                  disabled={isSaving}
                  className="btn-ghost text-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.97]"
                >
                  Delete
                </button>
              ) : <span />}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="btn-ghost" disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary active:scale-[0.97]" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Task"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
