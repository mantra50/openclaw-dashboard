"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";

// convex/_generated/dataModel 还没生成,先用 any 占位
type ScheduledTask = any;

type Priority = "low" | "medium" | "high";
type Status = "pending" | "in_progress" | "done" | "cancelled";

export interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  /** 编辑时传完整的 task;新建时只传要预填的字段(比如 dueAt) */
  initial?: Partial<ScheduledTask> & { _id?: string };
  /** 成功 create / update 后回调(可选) */
  onSubmit?: (task: ScheduledTask) => void;
}

/* ─────────────────────────────────────────────────────────────
 * ms <-> datetime-local 互转(datetime-local 用本地时区)
 * ───────────────────────────────────────────────────────────── */

function msToDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function datetimeLocalToMs(value: string): number {
  // new Date("YYYY-MM-DDTHH:mm") 解析为本地时区
  return new Date(value).getTime();
}

/* ─────────────────────────────────────────────────────────────
 * TaskModal
 * ───────────────────────────────────────────────────────────── */

export function TaskModal({
  open,
  onClose,
  initial,
  onSubmit,
}: TaskModalProps) {
  // 必须在所有 early-return 之前调用 hooks
  const createTask = useMutation(api.scheduledTasks.create);
  const updateTask = useMutation(api.scheduledTasks.update);
  const removeTask = useMutation(api.scheduledTasks.remove);

  const isEditMode = Boolean(initial?._id);

  // 表单 state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(msToDatetimeLocal(Date.now()));
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<Status>("pending");

  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 每次打开 / initial 变化 → 同步表单
  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setDueAt(msToDatetimeLocal(initial?.dueAt ?? Date.now()));
    setDurationMinutes(
      typeof initial?.durationMinutes === "number"
        ? initial.durationMinutes
        : ""
    );
    setPriority((initial?.priority as Priority) ?? "medium");
    setCategory(initial?.category ?? "");
    setStatus((initial?.status as Status) ?? "pending");
    setError(null);
  }, [open, initial]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("标题不能为空");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const dueAtMs = datetimeLocalToMs(dueAt);
      const dur =
        typeof durationMinutes === "number" && durationMinutes > 0
          ? durationMinutes
          : undefined;

      if (isEditMode && initial?._id) {
        await updateTask({
          id: initial._id,
          title: trimmed,
          description: description.trim() || undefined,
          dueAt: dueAtMs,
          durationMinutes: dur,
          status,
          priority,
          category: category.trim() || undefined,
        });
        onSubmit?.(initial as ScheduledTask);
      } else {
        const newId = await createTask({
          title: trimmed,
          description: description.trim() || undefined,
          dueAt: dueAtMs,
          durationMinutes: dur,
          priority,
          category: category.trim() || undefined,
        });
        onSubmit?.({ _id: newId } as ScheduledTask);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initial?._id) return;
    if (!confirm("确定要删除这个任务吗?")) return;
    setError(null);
    setRemoving(true);
    try {
      await removeTask({ id: initial._id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        // 点击 backdrop 自身才关闭,卡片内的点击不关
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "bg-bg-panel border border-border-strong rounded-lg shadow-2xl",
          "w-full max-w-md max-h-[90vh] overflow-y-auto"
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* 标题栏 */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">
            {isEditMode ? "编辑任务" : "新建任务"}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-lg leading-none w-6 h-6 flex items-center justify-center"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* 标题 */}
          <Field label="标题" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="比如:跟大王对齐 Q3 计划"
              className={inputCls}
              autoFocus
            />
          </Field>

          {/* 描述 */}
          <Field label="描述">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选 · 详细说明、上下文、链接…"
              rows={3}
              className={cn(inputCls, "resize-y min-h-[72px]")}
            />
          </Field>

          {/* 时间 + 时长 */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="时间" className="col-span-2">
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="时长(分)">
              <input
                type="number"
                min={0}
                step={5}
                value={durationMinutes}
                onChange={(e) => {
                  const v = e.target.value;
                  setDurationMinutes(v === "" ? "" : Number(v));
                }}
                placeholder="60"
                className={inputCls}
              />
            </Field>
          </div>

          {/* 优先级 */}
          <Field label="优先级">
            <SegmentedControl<Priority>
              value={priority}
              onChange={setPriority}
              options={[
                { value: "low", label: "低", tone: "muted" },
                { value: "medium", label: "中", tone: "amber" },
                { value: "high", label: "高", tone: "red" },
              ]}
            />
          </Field>

          {/* 分类 */}
          <Field label="分类">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="比如:work / personal / health"
              className={inputCls}
            />
          </Field>

          {/* 状态(仅编辑模式) */}
          {isEditMode && (
            <Field label="状态">
              <SegmentedControl<Status>
                value={status}
                onChange={setStatus}
                options={[
                  { value: "pending", label: "待办" },
                  { value: "in_progress", label: "进行中", tone: "blue" },
                  { value: "done", label: "已完成", tone: "muted" },
                  { value: "cancelled", label: "已取消", tone: "red" },
                ]}
              />
            </Field>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* 操作区 */}
          <div className="pt-2 flex items-center gap-2 border-t border-border">
            {isEditMode ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={removing || submitting}
                className="text-xs text-accent-red hover:bg-accent-red/10 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors"
              >
                {removing ? "删除中…" : "删除"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || removing}
              className="text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || removing}
              className="text-xs bg-accent-blue hover:bg-accent-blue/90 text-white disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-md font-medium transition-colors"
            >
              {submitting ? "保存中…" : isEditMode ? "保存" : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 小工具组件
 * ───────────────────────────────────────────────────────────── */

const inputCls =
  "w-full bg-bg-base border border-border rounded-md px-3 py-1.5 text-sm " +
  "text-text-primary placeholder:text-text-muted " +
  "focus:outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 " +
  "transition-colors";

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-text-secondary mb-1.5 font-medium">
        {label}
        {required && <span className="text-accent-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  tone?: "blue" | "amber" | "red" | "green" | "muted";
}

function SegmentedControl<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V;
  onChange: (v: V) => void;
  options: SegmentedOption<V>[];
}) {
  const activeToneCls: Record<string, string> = {
    blue: "bg-accent-blue/20 text-accent-blue",
    amber: "bg-accent-amber/20 text-accent-amber",
    red: "bg-accent-red/20 text-accent-red",
    green: "bg-accent-green/20 text-accent-green",
    muted: "bg-text-muted/20 text-text-secondary",
  };
  return (
    <div className="flex gap-1 bg-bg-base border border-border rounded-md p-0.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 px-2 py-1 text-xs rounded transition-colors",
              active
                ? activeToneCls[opt.tone ?? "muted"]
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
