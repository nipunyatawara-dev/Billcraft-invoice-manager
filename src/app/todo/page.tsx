"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { TODO_PRIORITIES, TODO_STAGES, getTodoPriorityStyles, sortTasksByPriorityThenOrder, assignOrdersFromColumnSequence, type TodoPriority, type TodoStageId, type TodoTask } from "@/data/todos";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { 
  SlidersHorizontal, 
  ListFilter, 
  Plus, 
  Calendar as CalendarIcon, 
  Briefcase, 
  Clock, 
  Check, 
  CheckCircle2, 
  Trash2, 
  Undo2, 
  AlertCircle, 
  Hexagon, 
  Minus,
  Layers, 
  User, 
  Mail, 
  MessageSquare, 
  FileText, 
  Link as LinkIcon, 
  Share2, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Handshake,
  Receipt,
  Upload,
  Info,
  X,
  ArrowUpDown,
  Tag,
  PlusCircle,
  MoreHorizontal
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";

import { PAGE_EYEBROWS } from "@/lib/page-meta";
import PlusIcon from "@/components/icons/plus-icon";
import LayersIcon from "@/components/icons/layers-icon";
import ClockIcon from "@/components/icons/clock-icon";
import TriangleAlertIcon from "@/components/icons/triangle-alert-icon";
import CheckedIcon from "@/components/icons/checked-icon";
import PenIcon from "@/components/icons/pen-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";


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
  return sortTasksByPriorityThenOrder(tasks);
}

function getStageTasks(tasks: TodoTask[], stage: TodoStageId) {
  return sortByOrder(tasks.filter((task) => task.stage === stage));
}

function normalizeStageOrder(tasks: TodoTask[]) {
  return TODO_STAGES.flatMap((stage) => {
    const stageTasks = getStageTasks(tasks, stage.id);
    return stageTasks.map((task, index) => ({ ...task, order: index }));
  });
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

function getWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");

  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "";
}

function getTaskDoneMessage(task: TodoTask) {
  return `Hi ${task.client || "there"}, ${task.invoiceId ? `${task.invoiceId} ` : ""}${task.title} is done.`;
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

const BacklogStatusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="2.2 2.2" className="text-muted-foreground/60" />
  </svg>
);

const InProgressStatusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="2" className="text-chart-strong/30" />
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="18 40" strokeDashoffset="0" className="text-chart-strong" />
  </svg>
);

const ReviewStatusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="2" className="text-positive/30" />
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="30 40" strokeDashoffset="0" className="text-positive" />
  </svg>
);

const DoneStatusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="2" className="text-category-2" />
    <path d="M4.5 7L6 8.5L9.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-category-2" />
  </svg>
);

export default function TodoPage() {
  const plusIconRef = useRef<AnimatedIconHandle>(null);
  const activeTasksIconRef = useRef<AnimatedIconHandle>(null);
  const inProgressIconRef = useRef<AnimatedIconHandle>(null);
  const dueSoonIconRef = useRef<AnimatedIconHandle>(null);
  const completedIconRef = useRef<AnimatedIconHandle>(null);

  const { activeProfile, loading, todoTasks, saveTodoTasks, clients, vendors, saveOutsourcingInvoice } = useUserData();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<"all" | TodoPriority>("all");
  const [filterClient, setFilterClient] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"order" | "date" | "priority" | "alphabetical">("order");
  const didDragRef = useRef(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll variables for Kanban board overflow detection
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const handleBoardScroll = () => {
    if (boardContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = boardContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollBoard = (direction: "left" | "right") => {
    if (boardContainerRef.current) {
      const scrollAmount = 340 + 16; // Column width (340px) + gap (16px)
      boardContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Run scroll verification on task / search updates or container resizing
  useEffect(() => {
    handleBoardScroll();

    if (!boardContainerRef.current) return;
    const observer = new ResizeObserver(handleBoardScroll);
    observer.observe(boardContainerRef.current);
    return () => observer.disconnect();
  }, [tasks, searchQuery, filterPriority, filterClient, sortBy]);

  // Inform Client modal states
  const [informTask, setInformTask] = useState<TodoTask | null>(null);

  // Outsource Task modal states
  const [outsourcingTask, setOutsourcingTask] = useState<TodoTask | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [newVendorName, setNewVendorName] = useState<string>("");
  const [newVendorEmail, setNewVendorEmail] = useState<string>("");
  const [newVendorPhone, setNewVendorPhone] = useState<string>("");
  const [outsourcePrice, setOutsourcePrice] = useState<string>("");
  const [vendorMode, setVendorMode] = useState<"select" | "custom">("select");
  const [saveVendorMode, setSaveVendorMode] = useState<"regular" | "onetime">("onetime");

  // Task client selector mode
  const [clientMode, setClientMode] = useState<"select" | "custom">("select");

  // Hovered invoice ID for interactive card highlighting
  const [hoveredInvoiceId, setHoveredInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(normalizeStageOrder(todoTasks));
  }, [todoTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = searchQuery.trim() === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.client && task.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.invoiceId && task.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
      const matchesClient = filterClient === "all" || task.client === filterClient;

      return matchesSearch && matchesPriority && matchesClient;
    });
  }, [tasks, searchQuery, filterPriority, filterClient]);

  const getSortedStageTasks = useMemo(() => {
    return (stageId: TodoStageId) => {
      const stageTasks = filteredTasks.filter((task) => task.stage === stageId);
      
      if (sortBy === "order") {
        return sortByOrder(stageTasks);
      }
      if (sortBy === "date") {
        return [...stageTasks].sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
      }
      if (sortBy === "priority") {
        return sortByOrder(stageTasks);
      }
      if (sortBy === "alphabetical") {
        return [...stageTasks].sort((a, b) => a.title.localeCompare(b.title));
      }
      return stageTasks;
    };
  }, [filteredTasks, sortBy]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id && todoTasks.length > 0 && !editingTaskId && !isTaskModalOpen) {
        const task = todoTasks.find(t => t.id === id);
        if (task) {
          setEditingTaskId(task.id);
          setForm({
            title: task.title,
            description: task.description || "",
            client: task.client || "",
            dueDate: task.dueDate || "",
            estimate: task.estimate || "",
            stage: task.stage,
            priority: task.priority,
            tags: task.tags.join(", "),
          });
          setIsTaskModalOpen(true);
        }
      }
    }
  }, [todoTasks, editingTaskId, isTaskModalOpen]);

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
      inProgress: tasks.filter((task) => task.stage === "in-progress" || task.stage === "review").length,
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
    setClientMode("select");
    setIsTaskModalOpen(true);
  }

  function openEditModal(task: TodoTask) {
    setEditingTaskId(task.id);
    setForm(getFormFromTask(task));
    const matched = clients.some(c => c.name === task.client);
    setClientMode(matched || !task.client ? "select" : "custom");
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
    const nextColumn = assignOrdersFromColumnSequence([
      ...targetColumn.slice(0, insertIndex),
      { ...movingTask, stage: targetStage, updatedAt: new Date().toISOString() },
      ...targetColumn.slice(insertIndex),
    ]);
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
    const orderedTasks = getSortedStageTasks(stage);
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

    const orderedTasks = getSortedStageTasks(stage);
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
    const matchedClient = clients.find(c => c.name.toLowerCase() === form.client.trim().toLowerCase());
    const nextTask: TodoTask = {
      id: existingTask?.id || createTaskId(),
      title,
      description: form.description.trim() || undefined,
      client: form.client.trim() || undefined,
      clientId: matchedClient?.id || existingTask?.clientId,
      clientEmail: matchedClient?.email || existingTask?.clientEmail,
      clientPhone: matchedClient?.phone || existingTask?.clientPhone,
      clientWhatsapp: matchedClient?.whatsapp || existingTask?.clientWhatsapp,
      invoiceId: existingTask?.invoiceId,
      jobColor: existingTask?.jobColor,
      deliveryLink: existingTask?.deliveryLink || matchedClient?.deliveryLink,
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

  async function handleOutsourceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!outsourcingTask) return;

    let vendorName = "";
    let vendorEmail = "";
    let vendorPhone = "";
    let vendorId: string | undefined = undefined;

    if (vendorMode === "select") {
      const v = vendors.find(x => x.id === selectedVendorId);
      if (v) {
        vendorName = v.name;
        vendorEmail = v.email || "";
        vendorPhone = v.phone || "";
        vendorId = v.id;
      }
    } else {
      vendorName = newVendorName.trim();
      vendorEmail = newVendorEmail.trim();
      vendorPhone = newVendorPhone.trim();
    }

    if (!vendorName) {
      notify.warning({
        title: "Subcontractor name required",
        description: "Please select or enter a subcontractor name.",
      });
      return;
    }

    const price = parseFloat(outsourcePrice);
    if (isNaN(price) || price <= 0) {
      notify.warning({
        title: "Invalid price",
        description: "Please enter a valid price for outsourcing.",
      });
      return;
    }

    const draft = {
      vendorId,
      vendor: vendorName,
      email: vendorEmail,
      phone: vendorPhone,
      date: todayInputValue(),
      dueDate: todayInputValue(),
      status: "Unpaid" as const,
      templateId: "classic",
      templateName: "Classic",
      items: [
        {
          id: `item-${Date.now().toString(36)}-0`,
          description: `Outsourced task: ${outsourcingTask.title}`,
          quantity: 1,
          price: price,
        }
      ],
      saveVendorMode: vendorMode === "custom" ? saveVendorMode : undefined,
    };

    setIsSaving(true);

    try {
      await notifyPromise(saveOutsourcingInvoice(draft), {
        loading: {
          title: "Creating payable...",
          description: "Generating subcontractor outsourcing invoice.",
        },
        success: {
          title: "Outsourced successfully",
          description: `Payable invoice created for ${vendorName}.`,
        },
        error: (error) => ({
          title: "Outsourcing failed",
          description: getToastErrorMessage(error, "Unable to outsource task."),
        }),
      });

      // Update the task to add "Outsourced" tag
      const updatedTask: TodoTask = {
        ...outsourcingTask,
        tags: Array.from(new Set([...(outsourcingTask.tags || []), "Outsourced"])),
        updatedAt: new Date().toISOString(),
      };
      
      const nextTasks = tasks.map(t => t.id === outsourcingTask.id ? updatedTask : t);
      await saveTodoTasks(nextTasks);

      setOutsourcingTask(null);
      setSelectedVendorId("");
      setNewVendorName("");
      setNewVendorEmail("");
      setNewVendorPhone("");
      setOutsourcePrice("");
      setVendorMode("select");
      setSaveVendorMode("onetime");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  const showTrashZone = draggingTaskId !== null || selectedTaskIds.size > 0;
  const taskModalTitle = editingTaskId ? "Update task" : "New task";

  return (
    <>
      <main className="app-main-wide flex-1">
        {/* Page Heading */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <AnimatedText as="p" text={PAGE_EYEBROWS["/todo"]} effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text="To-Do"
              effect="micro-scale-fade"
              className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
              delayMs={70}
            />
            <AnimatedText
              as="p"
              text="Organize project tasks, track stages, subcontract vendor work, and bill clients."
              effect="micro-scale-fade"
              className="text-muted mt-2 text-base font-medium"
              delayMs={140}
            />
          </div>
          <div className="flex items-center gap-2">
            {undoSnapshot && !draggingTaskId && (
              <button
                onClick={() => void handleUndo()}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-card border border-card-border text-foreground hover:bg-foreground/[0.04] px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                aria-label={`Undo delete of ${undoSnapshot.label}`}
                title={`Undo — restore ${undoSnapshot.label}`}
              >
                <Undo2 className="size-3.5" />
                <span>Undo</span>
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
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] border ${
                  isTrashHovered && draggingTaskId
                    ? "bg-red-500/10 border-red-500 text-red-500"
                    : selectedTaskIds.size > 0
                      ? "bg-red-500/10 border-red-500 text-red-500"
                      : "bg-card border-card-border text-muted-foreground hover:bg-foreground/[0.04]"
                }`}
                aria-label={selectedTaskIds.size > 0 ? `Delete ${selectedTaskIds.size} selected` : "Drop here to delete"}
                title={selectedTaskIds.size > 0 ? `Delete ${selectedTaskIds.size} selected` : "Drop here to delete"}
              >
                <Trash2 className="size-3.5" />
                {draggingTaskId ? (
                  <span>Drop to delete</span>
                ) : selectedTaskIds.size > 0 ? (
                  <span>Delete Selected ({selectedTaskIds.size})</span>
                ) : null}
              </button>
            )}
            <button 
              onClick={() => openCreateModal()} 
              onMouseEnter={() => plusIconRef.current?.startAnimation()}
              onMouseLeave={() => plusIconRef.current?.stopAnimation()}
              className="flex items-center gap-2 bg-card border border-card-border text-foreground hover:bg-accent hover:text-action-text hover:border-accent px-5 py-2.5 rounded-xl font-medium transition-all shadow-xs hover:shadow-md hover:shadow-accent/20 group active:scale-[0.97]"
            >
              <PlusIcon ref={plusIconRef} size={20} className="transition-transform duration-300" />
              Add Task
            </button>
          </div>
        </header>

        {/* Overview Stats — compact row so the board stays primary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          <div
            onMouseEnter={() => activeTasksIconRef.current?.startAnimation()}
            onMouseLeave={() => activeTasksIconRef.current?.stopAnimation()}
            className="flex items-center gap-2.5 bg-card rounded-lg border border-card-border px-3 py-2 group/card transition-colors hover:border-accent/25 select-none"
          >
            <LayersIcon ref={activeTasksIconRef} size={16} className="text-muted-foreground group-hover/card:text-accent transition-colors shrink-0" />
            <span className="text-[11px] font-medium text-muted truncate flex-1 min-w-0">Active Tasks</span>
            <span className="text-base font-bold tabular-nums text-foreground shrink-0">
              <AnimatedNumber value={stats.active} />
            </span>
          </div>

          <div
            onMouseEnter={() => inProgressIconRef.current?.startAnimation()}
            onMouseLeave={() => inProgressIconRef.current?.stopAnimation()}
            className="flex items-center gap-2.5 bg-card rounded-lg border border-card-border px-3 py-2 group/card transition-colors hover:border-accent/25 select-none"
          >
            <ClockIcon ref={inProgressIconRef} size={16} className="text-chart-strong shrink-0" />
            <span className="text-[11px] font-medium text-muted truncate flex-1 min-w-0">In Progress</span>
            <span className="text-base font-bold tabular-nums text-foreground shrink-0">
              <AnimatedNumber value={stats.inProgress} />
            </span>
          </div>

          <div
            onMouseEnter={() => dueSoonIconRef.current?.startAnimation()}
            onMouseLeave={() => dueSoonIconRef.current?.stopAnimation()}
            className="flex items-center gap-2.5 bg-card rounded-lg border border-card-border px-3 py-2 group/card transition-colors hover:border-accent/25 select-none"
          >
            <TriangleAlertIcon ref={dueSoonIconRef} size={16} className="text-accent shrink-0" />
            <span className="text-[11px] font-medium text-muted truncate flex-1 min-w-0">Due Soon</span>
            <span className="text-base font-bold tabular-nums text-foreground shrink-0">
              <AnimatedNumber value={stats.dueSoon} />
            </span>
          </div>

          <div
            onMouseEnter={() => completedIconRef.current?.startAnimation()}
            onMouseLeave={() => completedIconRef.current?.stopAnimation()}
            className="flex items-center gap-2.5 bg-card rounded-lg border border-card-border px-3 py-2 group/card transition-colors hover:border-accent/25 select-none"
          >
            <CheckedIcon ref={completedIconRef} size={16} className="text-positive shrink-0" />
            <span className="text-[11px] font-medium text-muted truncate flex-1 min-w-0">Completed</span>
            <span className="text-base font-bold tabular-nums text-foreground shrink-0">
              <AnimatedNumber value={stats.completed} />
            </span>
          </div>
        </div>

        {/* Search, Filters, and Sorting Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          <AnimatedSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search tasks..."
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 bg-card border border-card-border text-foreground hover:bg-foreground/[0.04] px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] cursor-pointer">
                  <SlidersHorizontal className="size-3.5" />
                  <span>Filter</span>
                  {(filterPriority !== "all" || filterClient !== "all") && (
                    <span className="size-2 rounded-full bg-accent shrink-0 animate-pulse" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 bg-card border border-card-border rounded-xl shadow-lg z-[110]" align="start">
                <div className="space-y-4">
                  {/* Priority Filter */}
                  <div>
                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Layers className="size-3.5" />
                      Priority
                    </h4>
                    <div className="space-y-1">
                      {["all", ...TODO_PRIORITIES].map((p) => {
                        const isSelected = filterPriority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFilterPriority(p as any)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                              isSelected 
                                ? "bg-accent/10 text-accent font-semibold" 
                                : "text-foreground/80 hover:bg-foreground/[0.03]"
                            }`}
                          >
                            <span className="capitalize">{p === "all" ? "All Priorities" : p}</span>
                            {isSelected && <Check className="size-3.5 text-accent" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator className="bg-card-border" />

                  {/* Client Filter */}
                  <div>
                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Briefcase className="size-3.5" />
                      Client Link
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setFilterClient("all")}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          filterClient === "all" 
                            ? "bg-accent/10 text-accent font-semibold" 
                            : "text-foreground/80 hover:bg-foreground/[0.03]"
                        }`}
                      >
                        <span>All Clients</span>
                        {filterClient === "all" && <Check className="size-3.5 text-accent" />}
                      </button>
                      {Array.from(new Set([
                        ...clients.map(c => c.name),
                        ...tasks.map(t => t.client).filter(Boolean) as string[]
                      ])).map((clientName) => {
                        const isSelected = filterClient === clientName;
                        return (
                          <button
                            key={clientName}
                            type="button"
                            onClick={() => setFilterClient(clientName)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                              isSelected 
                                ? "bg-accent/10 text-accent font-semibold" 
                                : "text-foreground/80 hover:bg-foreground/[0.03]"
                            }`}
                          >
                            <span className="truncate">{clientName}</span>
                            {isSelected && <Check className="size-3.5 text-accent" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(filterPriority !== "all" || filterClient !== "all") && (
                    <>
                      <Separator className="bg-card-border" />
                      <button
                        type="button"
                        onClick={() => {
                          setFilterPriority("all");
                          setFilterClient("all");
                        }}
                        className="w-full text-center py-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
                      >
                        Clear all filters
                      </button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 bg-card border border-card-border text-foreground hover:bg-foreground/[0.04] px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] cursor-pointer">
                  <ListFilter className="size-3.5" />
                  <span>Sort</span>
                  {sortBy !== "order" && (
                    <span className="text-[10px] text-accent font-bold bg-accent/10 px-1.5 py-0.5 rounded-md capitalize">
                      {sortBy}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-card border border-card-border rounded-xl shadow-lg z-[110]">
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wider">
                  <ArrowUpDown className="size-3.5" />
                  Sort Options
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-card-border" />
                {[
                  { id: "order", label: "Board Order", icon: Layers },
                  { id: "date", label: "Due Date", icon: CalendarIcon },
                  { id: "priority", label: "Priority", icon: AlertCircle },
                  { id: "alphabetical", label: "Alphabetical", icon: ListFilter }
                ].map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = sortBy === option.id;
                  return (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => setSortBy(option.id as any)}
                      className={`flex items-center justify-between gap-2 text-xs cursor-pointer rounded-lg p-2 ${
                        isSelected ? "bg-accent/10 text-accent font-semibold" : "text-foreground/80"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <IconComponent className="size-3.5 text-muted-foreground" />
                        <span>{option.label}</span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-accent" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {(searchQuery.trim() !== "" || filterPriority !== "all" || filterClient !== "all" || sortBy !== "order") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterPriority("all");
                  setFilterClient("all");
                  setSortBy("order");
                }}
                className="text-xs font-semibold text-accent hover:underline ml-2 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="relative group/board">
          {/* Floating Navigation Arrow Left */}
          {showLeftArrow && (
            <button
              type="button"
              onClick={() => scrollBoard("left")}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full flex items-center justify-center bg-card/90 hover:bg-card border border-card-border shadow-lg text-foreground hover:text-accent transition-all hover:scale-105 active:scale-95 cursor-pointer hidden md:flex"
              aria-label="Scroll board left"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {/* Floating Navigation Arrow Right */}
          {showRightArrow && (
            <button
              type="button"
              onClick={() => scrollBoard("right")}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full flex items-center justify-center bg-card/90 hover:bg-card border border-card-border shadow-lg text-foreground hover:text-accent transition-all hover:scale-105 active:scale-95 cursor-pointer hidden md:flex"
              aria-label="Scroll board right"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          <div 
            ref={boardContainerRef}
            onScroll={handleBoardScroll}
            className="flex gap-4 overflow-x-auto pb-4 no-scrollbar min-w-full items-start"
          >
          {TODO_STAGES.map((stage) => {
            const stageTasks = getSortedStageTasks(stage.id);
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
                className={`w-[300px] sm:w-[340px] shrink-0 bg-card/60 border border-card-border rounded-xl p-3.5 flex flex-col max-h-[calc(100vh-14rem)] transition-smooth ${
                  isColumnTarget ? "border-accent/50 bg-foreground/[0.03]" : ""
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-card-border/60 mb-3.5 select-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-6 bg-foreground/[0.04] rounded-lg flex items-center justify-center shrink-0">
                      {stage.id === "backlog" && <BacklogStatusIcon />}
                      {stage.id === "in-progress" && <InProgressStatusIcon />}
                      {stage.id === "review" && <ReviewStatusIcon />}
                      {stage.id === "done" && <DoneStatusIcon />}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h2 className="text-[13px] font-semibold text-foreground truncate">{stage.label}</h2>
                      <span className="px-2 py-0.5 rounded-full bg-foreground/[0.04] text-[10px] font-bold text-muted-foreground/70">
                        {stageTasks.length}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openCreateModal(stage.id)}
                    className="size-6 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-accent hover:bg-accent/10 transition-smooth cursor-pointer"
                    aria-label={`Add task to ${stage.label}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                {/* Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-0.5 no-scrollbar min-h-[180px]">
                  {loading && stageTasks.length === 0 ? (
                    <div className="rounded-xl border border-card-border bg-foreground/[0.02] p-4">
                      <div className="h-3 w-24 rounded-full bg-foreground/10 mb-3" />
                      <div className="h-2 w-full rounded-full bg-foreground/10 mb-2" />
                      <div className="h-2 w-2/3 rounded-full bg-foreground/10" />
                    </div>
                  ) : stageTasks.length > 0 ? (
                    stageTasks.map((task) => {
                      const isDragging = draggingTaskId === task.id;
                      const isBeforeTarget = dragTarget?.stage === stage.id && dragTarget.beforeTaskId === task.id;
                      const isSelected = selectedTaskIds.has(task.id);

                      const isGroupHovered = hoveredInvoiceId !== null && task.invoiceId === hoveredInvoiceId;
                      const isDimmed = hoveredInvoiceId !== null && task.invoiceId !== hoveredInvoiceId;

                      return (
                        <div key={task.id} className="relative group/tile">
                          {isBeforeTarget && <div className="absolute -top-1.5 left-0 right-0 h-0.5 rounded-full bg-accent animate-pulse" />}
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
                            onMouseEnter={() => {
                              if (task.invoiceId) {
                                setHoveredInvoiceId(task.invoiceId);
                              }
                            }}
                            onMouseLeave={() => {
                              if (task.invoiceId) {
                                setHoveredInvoiceId(null);
                              }
                            }}
                            style={{
                              borderColor: isGroupHovered && task.jobColor ? task.jobColor : undefined,
                              boxShadow: isGroupHovered && task.jobColor ? `0 8px 30px ${task.jobColor}25` : undefined,
                            }}
                            className={`relative overflow-hidden rounded-xl border p-4 cursor-grab active:cursor-grabbing transition-all duration-300 bg-background hover:shadow-md ${
                              isDragging ? "opacity-40 scale-[0.96] border-card-border" : ""
                            } ${
                              isDimmed ? "opacity-35 scale-[0.98] blur-[0.2px] border-card-border" : ""
                            } ${
                              isSelected
                                ? "border-accent bg-gradient-to-br from-accent/[0.04] to-accent/[0.005] ring-2 ring-accent/35"
                                : !isDimmed
                                  ? "border-card-border hover:border-accent/40"
                                  : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap gap-1 mb-2">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider uppercase shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${getTodoPriorityStyles(task.priority)}`}>
                                    {task.priority === "High" && <AlertCircle className="size-2.5 text-accent" />}
                                    {task.priority === "Medium" && <Hexagon className="size-2.5 text-cyan-500" />}
                                    {task.priority === "Low" && <Minus className="size-2.5 text-muted-foreground" />}
                                    {task.priority}
                                  </span>
                                  {task.invoiceId && (
                                    <span 
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider uppercase border transition-all duration-200"
                                      style={{
                                        backgroundColor: task.jobColor ? `${task.jobColor}15` : "var(--foreground)/[0.06]",
                                        borderColor: task.jobColor ? `${task.jobColor}35` : "transparent",
                                        color: task.jobColor || "var(--foreground)/60"
                                      }}
                                    >
                                      {task.jobColor && (
                                        <span className="size-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: task.jobColor }} />
                                      )}
                                      {task.invoiceId}
                                    </span>
                                  )}
                                  {task.tags.slice(0, 2).map((tag) => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-foreground/[0.04] text-[9.5px] font-bold text-muted tracking-wider uppercase">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <h3 className="text-xs sm:text-[13px] font-bold text-foreground leading-snug tracking-tight group-hover/tile:text-accent transition-colors duration-200">
                                  {task.title}
                                </h3>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(task);
                                }}
                                className="size-6 flex items-center justify-center rounded-md text-foreground/20 hover:text-accent hover:bg-accent/10 transition-all duration-200 shrink-0 hover:scale-110 active:scale-95 cursor-pointer"
                                aria-label={`Edit ${task.title}`}
                              >
                                <PenIcon size={12} />
                              </button>
                            </div>

                            {task.description && (
                              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
                                {task.description}
                              </p>
                            )}

                            {/* Separator */}
                            <div className="border-t border-card-border border-dashed mt-3 pt-3 flex flex-col gap-2">
                              {/* Metadata indicators */}
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10px] text-muted-foreground font-semibold">
                                <span className="inline-flex items-center gap-1 min-w-0" title={task.client || "General"}>
                                  <Briefcase className="size-3 shrink-0 text-muted-foreground/70" />
                                  <span className="truncate">{task.client || "General"}</span>
                                </span>
                                <span className={`inline-flex items-center gap-1 ${getDueTone(task.dueDate, task.stage)}`}>
                                  <CalendarIcon className="size-3 shrink-0" />
                                  <span>{formatDueDate(task.dueDate)}</span>
                                </span>
                                {task.estimate && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="size-3 shrink-0 text-muted-foreground/70" />
                                    <span>{task.estimate}</span>
                                  </span>
                                )}
                              </div>

                              {/* Card Actions Footer */}
                              <div className="mt-1 flex flex-col gap-1.5">
                                {/* Non-done tasks optional Outsource action */}
                                {!task.tags.includes("Outsourced") && task.stage !== "done" && (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOutsourcingTask(task);
                                      const parsedPrice = parseFloat(task.estimate ? task.estimate.replace(/[^\d.]/g, "") : "");
                                      setOutsourcePrice(!isNaN(parsedPrice) ? parsedPrice.toString() : "");
                                    }}
                                    className="w-full bg-card hover:bg-accent/5 border border-accent/25 hover:border-accent/50 text-accent rounded-lg px-2 py-1 text-[10px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all cursor-pointer shadow-xs"
                                  >
                                    <Handshake className="size-3" />
                                    Outsource Task
                                  </button>
                                )}

                                {/* Done tasks actions (Inform / Upload) */}
                                {task.stage === "done" && (
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {(task.clientEmail || task.clientWhatsapp || task.clientPhone) && (
                                      <button
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setInformTask(task);
                                        }}
                                        className="w-full bg-card hover:bg-foreground/[0.03] border border-card-border rounded-lg px-2 py-1 text-[10px] font-bold flex items-center justify-center gap-1 active:scale-[0.97] transition-all cursor-pointer shadow-xs"
                                      >
                                        <Info className="size-3" />
                                        Inform
                                      </button>
                                    )}
                                    {task.deliveryLink && (
                                      <a
                                        href={task.deliveryLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(event) => event.stopPropagation()}
                                        className="w-full bg-card hover:bg-positive/5 border border-card-border hover:border-positive/45 hover:text-positive rounded-lg px-2 py-1 text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-xs"
                                      >
                                        <Upload className="size-3" />
                                        Upload
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* Dynamic "Create Invoice" option for ANY task stage if not yet billed */}
                                {!task.invoiceId ? (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      window.location.href = `/invoices?prefillTaskId=${task.id}`;
                                    }}
                                    className="w-full bg-card hover:bg-accent/5 border border-accent/25 hover:border-accent/55 text-accent rounded-lg px-2 py-1 text-[10px] font-bold flex items-center justify-center gap-1 active:scale-[0.97] transition-all cursor-pointer shadow-xs"
                                  >
                                    <Receipt className="size-3" />
                                    Create Invoice
                                  </button>
                                ) : (
                                  <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center justify-center gap-1 border border-emerald-500/25 select-none">
                                    <CheckCircle2 className="size-3 text-emerald-500" />
                                    Billed ({task.invoiceId})
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <button
                      onClick={() => openCreateModal(stage.id)}
                      className="w-full min-h-[120px] rounded-lg border border-dashed border-card-border bg-foreground/[0.015] flex flex-col items-center justify-center text-center p-4 transition-all hover:border-accent/40 hover:bg-accent/[0.02] cursor-pointer"
                    >
                      <Plus className="size-5 text-muted-foreground/50 mb-1.5" />
                      <span className="text-[11px] font-bold text-muted-foreground/70">Add a card</span>
                    </button>
                  )}
                </div>

                {/* Column Footer Quick Add */}
                {stageTasks.length > 0 && (
                  <button
                    onClick={() => openCreateModal(stage.id)}
                    className="w-full hover:bg-foreground/[0.03] text-muted-foreground hover:text-foreground text-xs font-semibold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all mt-3 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add task</span>
                  </button>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            aria-label="Close task editor"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeModal}
          />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-card shrink-0 select-none">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                <Layers className="size-4.5 text-muted-foreground" />
                <AnimatedText
                  as="h2"
                  text={taskModalTitle}
                  effect="fade-through"
                  className="text-lg font-bold text-foreground leading-none font-display"
                  replayKey={taskModalTitle}
                />
              </div>
              <button type="button" onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.04] transition-smooth text-muted hover:text-foreground cursor-pointer">
                <X className="size-4.5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleTaskSubmit} className="flex-1 flex flex-col min-h-0 bg-background/35">
              <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
                
                {/* 1. Task Description & Scope Card */}
                <div className="surface-card p-4 space-y-4 rounded-xl border border-card-border bg-card">
                  <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider">Task Definition</h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="task-title">Title</label>
                    <input
                      id="task-title"
                      required
                      value={form.title}
                      onChange={(event) => setForm({ ...form, title: event.target.value })}
                      placeholder="What needs to be done?"
                      className="field-control px-3 py-1.5 text-[13px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="task-description">Description</label>
                    <textarea
                      id="task-description"
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="Context details, bullet checklist, or scope notes..."
                      className="field-control min-h-20 px-3 py-1.5 text-[13px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="task-stage">Stage</label>
                      <div className="relative flex items-center">
                        <select
                          id="task-stage"
                          value={form.stage}
                          onChange={(event) => setForm({ ...form, stage: event.target.value as TodoStageId })}
                          className="field-control px-3 py-1.5 text-[13px] appearance-none"
                        >
                          {TODO_STAGES.map((stage) => <option key={stage.id} value={stage.id} className="text-foreground bg-background">{stage.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 size-4 text-muted pointer-events-none" />
                      </div>
                    </div>

                    {/* Priority Selector as button pills */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">Priority Level</label>
                      <div className="flex gap-1">
                        {TODO_PRIORITIES.map((p) => {
                          const isSelected = form.priority === p;
                          let colorClass = "border-card-border text-muted bg-card hover:border-foreground/10";
                          if (isSelected) {
                            if (p === "Low") colorClass = "bg-slate-500/10 border-slate-500 text-slate-500 shadow-xs";
                            else if (p === "Medium") colorClass = "bg-cyan-500/10 border-cyan-500 text-cyan-500 shadow-xs";
                            else if (p === "High") colorClass = "bg-orange-500/10 border-orange-500 text-orange-500 shadow-xs";
                          }
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setForm({ ...form, priority: p })}
                              className={`flex-1 min-h-7 rounded-lg border text-[10px] font-bold transition-all duration-200 active:scale-[0.96] cursor-pointer ${colorClass}`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Relations, Deadlines & Tags Card */}
                <div className="surface-card p-4 space-y-4 rounded-xl border border-card-border bg-card">
                  <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider">Relations & Constraints</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1 col-span-1">
                      <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="task-client-select">Client Link</label>
                      {clientMode === "select" ? (
                        <div className="relative flex items-center">
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
                            className="field-control px-3 py-1.5 text-[13px] appearance-none"
                          >
                            <option value="" className="text-foreground bg-background">General</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.name} className="text-foreground bg-background">{c.name}</option>
                            ))}
                            <option value="__custom__" className="text-foreground bg-background">+ Add Custom...</option>
                          </select>
                          <ChevronDown className="absolute right-3 size-4 text-muted pointer-events-none" />
                        </div>
                      ) : (
                        <div className="flex gap-1.5 items-center">
                          <input
                            id="task-client"
                            value={form.client}
                            onChange={(event) => setForm({ ...form, client: event.target.value })}
                            placeholder="Client name"
                            className="field-control px-2.5 py-1.5 text-[13px] flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setClientMode("select");
                              setForm({ ...form, client: "" });
                            }}
                            className="text-[9px] font-bold text-accent hover:underline shrink-0 cursor-pointer"
                          >
                            Saved
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 col-span-1">
                      <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="task-due">Due Date</label>
                      <input
                        id="task-due"
                        type="date"
                        value={form.dueDate}
                        onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                        className="field-control px-3 py-1.5 text-[13px]"
                      />
                    </div>

                    <div className="space-y-1 col-span-1">
                      <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="task-estimate">Estimate / Effort</label>
                      <div className="relative flex items-center">
                        <Clock className="absolute left-3 size-4 text-muted-foreground/50 pointer-events-none" />
                        <input
                          id="task-estimate"
                          value={form.estimate}
                          onChange={(event) => setForm({ ...form, estimate: event.target.value })}
                          placeholder="e.g. 2h, 45m"
                          className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="task-tags">Category Tags</label>
                    <div className="relative flex items-center">
                      <Tag className="absolute left-3 size-4 text-muted-foreground/50 pointer-events-none" />
                      <input
                        id="task-tags"
                        value={form.tags}
                        onChange={(event) => setForm({ ...form, tags: event.target.value })}
                        placeholder="e.g. Design, Scope, Revision (comma separated)"
                        className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-card-border bg-card shrink-0 z-10 select-none">
                {editingTaskId ? (
                  <button
                    type="button"
                    onClick={() => void deleteTask(editingTaskId)}
                    disabled={isSaving}
                    className="text-[11px] font-bold text-negative hover:underline active:scale-[0.97] transition-all cursor-pointer"
                  >
                    Delete Task
                  </button>
                ) : <span />}
                
                <div className="flex gap-2">
                  <button type="button" onClick={closeModal} className="btn-ghost min-h-9 px-4 rounded-xl text-[12px] font-bold cursor-pointer" disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary min-h-9 px-5 rounded-xl text-[12px] font-bold shadow-md active:scale-[0.97] cursor-pointer" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Task"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {outsourcingTask && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            aria-label="Close outsource panel"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setOutsourcingTask(null)}
          />
          <form onSubmit={handleOutsourceSubmit} className="modal-surface relative max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-card shrink-0 select-none">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                <Handshake className="size-4.5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider leading-none mb-1">Outsource Task</p>
                  <h2 className="text-sm font-bold text-foreground leading-none font-display truncate max-w-[280px]">
                    {outsourcingTask.title}
                  </h2>
                </div>
              </div>
              <button type="button" onClick={() => setOutsourcingTask(null)} className="size-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.04] transition-smooth text-muted hover:text-foreground cursor-pointer">
                <X className="size-4.5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-background/35">
              <div className="surface-card p-4 space-y-4 rounded-xl border border-card-border bg-card">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">Subcontractor Selection</label>
                  {vendorMode === "select" ? (
                    <div className="relative">
                      <select
                        value={selectedVendorId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__new__") {
                            setVendorMode("custom");
                            setSelectedVendorId("");
                          } else {
                            setSelectedVendorId(val);
                          }
                        }}
                        className="field-control pr-10 pl-3 py-2 w-full appearance-none rounded-xl border border-card-border bg-background text-[13px] font-medium transition-all"
                      >
                        <option value="" className="text-foreground bg-background">-- Select a Subcontractor --</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id} className="text-foreground bg-background">{v.name} {v.company ? `(${v.company})` : ""}</option>
                        ))}
                        <option value="__new__" className="text-foreground bg-background">+ Add New Subcontractor...</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
                    </div>
                  ) : (
                    <div className="space-y-3 border border-dashed border-card-border rounded-xl p-3.5 bg-foreground/[0.01]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-accent uppercase tracking-wider">New Subcontractor Info</span>
                        <button
                          type="button"
                          onClick={() => {
                            setVendorMode("select");
                            setSelectedVendorId("");
                          }}
                          className="text-[10px] text-muted hover:text-foreground hover:underline transition-smooth font-bold"
                        >
                          Choose Saved
                        </button>
                      </div>

                      <div className="space-y-2">
                        <input
                          placeholder="Subcontractor Name"
                          value={newVendorName}
                          onChange={(e) => setNewVendorName(e.target.value)}
                          required
                          className="field-control px-3 py-1.5 w-full text-[13px] rounded-xl border border-card-border bg-background"
                        />
                        <input
                          type="email"
                          placeholder="Email (optional)"
                          value={newVendorEmail}
                          onChange={(e) => setNewVendorEmail(e.target.value)}
                          className="field-control px-3 py-1.5 w-full text-[13px] rounded-xl border border-card-border bg-background"
                        />
                        <input
                          placeholder="Phone (optional)"
                          value={newVendorPhone}
                          onChange={(e) => setNewVendorPhone(e.target.value)}
                          className="field-control px-3 py-1.5 w-full text-[13px] rounded-xl border border-card-border bg-background"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1 select-none">
                        <input
                          type="checkbox"
                          id="save-vendor-checkbox"
                          checked={saveVendorMode === "regular"}
                          onChange={(e) => setSaveVendorMode(e.target.checked ? "regular" : "onetime")}
                          className="rounded border-card-border text-accent focus:ring-accent size-3.5 cursor-pointer"
                        />
                        <label htmlFor="save-vendor-checkbox" className="text-[11px] text-muted cursor-pointer font-medium hover:text-foreground transition-colors">
                          Save to Subcontractors directory
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="surface-card p-4 space-y-4 rounded-xl border border-card-border bg-card">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">Outsourcing Price</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-[13px] font-semibold select-none">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={outsourcePrice}
                      onChange={(e) => setOutsourcePrice(e.target.value)}
                      required
                      className="field-control pl-7 pr-3.5 py-2 w-full text-[14px] font-semibold rounded-xl border border-card-border bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-card-border bg-card shrink-0 select-none gap-2">
              <button type="button" onClick={() => setOutsourcingTask(null)} className="btn-ghost min-h-9 px-4 rounded-xl text-[12px] font-bold cursor-pointer" disabled={isSaving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary min-h-9 px-5 rounded-xl text-[12px] font-bold shadow-md active:scale-[0.97] cursor-pointer" disabled={isSaving}>
                {isSaving ? "Outsourcing..." : "Outsource Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {informTask && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            aria-label="Close inform panel"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setInformTask(null)}
          />
          <div className="modal-surface relative max-w-sm w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-card shrink-0 select-none">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                <Info className="size-4.5 text-muted-foreground" />
                <h2 className="text-sm font-bold text-foreground leading-none font-display">
                  Inform Client
                </h2>
              </div>
              <button type="button" onClick={() => setInformTask(null)} className="size-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.04] transition-smooth text-muted hover:text-foreground cursor-pointer">
                <X className="size-4.5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-background/35">
              <p className="text-[12px] text-muted leading-relaxed">
                Select how you want to inform <strong className="font-semibold text-foreground">{informTask.client || "Client"}</strong> that <strong className="font-semibold text-foreground">{informTask.title}</strong> is completed:
              </p>

              <div className="space-y-2.5">
                {(() => {
                  const doneMessage = getTaskDoneMessage(informTask);
                  const contactChannels = [];
                  if (informTask.clientEmail) {
                    contactChannels.push({
                      id: "email",
                      label: "Email",
                      icon: <Mail className="size-4.5" />,
                      href: `mailto:${informTask.clientEmail}?subject=${encodeURIComponent(`${informTask.invoiceId || "Finished work"} is done`)}&body=${encodeURIComponent(doneMessage)}`,
                      external: false,
                    });
                  }
                  if (informTask.clientWhatsapp) {
                    contactChannels.push({
                      id: "whatsapp",
                      label: "WhatsApp",
                      icon: <MessageSquare className="size-4.5" />,
                      href: getWhatsAppUrl(informTask.clientWhatsapp, doneMessage),
                      external: true,
                    });
                  }
                  if (informTask.clientPhone && !informTask.clientWhatsapp) {
                    contactChannels.push({
                      id: "sms",
                      label: "Normal Message (SMS)",
                      icon: <MessageSquare className="size-4.5" />,
                      href: `sms:${informTask.clientPhone}?body=${encodeURIComponent(doneMessage)}`,
                      external: false,
                    });
                  }
                  
                  return (
                    <>
                      {contactChannels.map((channel) => (
                        <a
                          key={channel.id}
                          href={channel.href}
                          target={channel.external ? "_blank" : undefined}
                          rel={channel.external ? "noreferrer" : undefined}
                          onClick={() => setInformTask(null)}
                          className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-card-border bg-card hover:border-accent/40 hover:bg-accent/[0.02] active:scale-[0.99] transition-all duration-200 group"
                        >
                          <span className="size-10 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-action-text flex items-center justify-center shrink-0 transition-all duration-200">
                            {channel.icon}
                          </span>
                          <div className="text-left flex-1 min-w-0">
                            <span className="block text-[13px] font-bold text-foreground group-hover:text-accent transition-colors">{channel.label}</span>
                            <span className="block text-[10px] text-muted-foreground truncate">Send instantly via {channel.label.toLowerCase()}</span>
                          </div>
                          <ChevronRight className="size-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200" />
                        </a>
                      ))}
                      {contactChannels.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-card-border rounded-xl bg-card/50 text-center">
                          <Info className="size-6 text-muted mb-2.5" />
                          <span className="text-[12px] font-semibold text-foreground mb-1">No Contact Information</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            No contact details found for this client. Please edit the client in directory to add an email or phone number.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-card-border bg-card shrink-0 select-none">
              <button type="button" onClick={() => setInformTask(null)} className="btn-ghost min-h-9 px-4 rounded-xl text-[12px] font-bold cursor-pointer w-full">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
