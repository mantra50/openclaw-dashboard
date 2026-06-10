"use client";

import { useMemo } from "react";
import { cn, weekDays, DAY_NAMES_CN, formatTime } from "@/lib/utils";

// convex/_generated/dataModel 还没生成,先用 any 占位
// 后续可替换为: import type { Doc } from "convex/_generated/dataModel"; type ScheduledTask = Doc<"scheduledTasks">;
type ScheduledTask = any;

interface CalendarWeekProps {
  weekStartMs: number;
  tasks: ScheduledTask[];
  onTaskClick: (task: ScheduledTask) => void;
  onSlotClick: (dateMs: number) => void;
}

/**
 * 7 列周视图:周一 → 周日
 *  - 列头:周几名 + 日期
 *  - 列体:当天任务(按时间排序)+ 空列的"暂无任务"占位
 *  - 任务卡片颜色按 priority,但 done/cancelled 走 deleted 样式
 */
export function CalendarWeek({
  weekStartMs,
  tasks,
  onTaskClick,
  onSlotClick,
}: CalendarWeekProps) {
  const days = useMemo(() => weekDays(weekStartMs), [weekStartMs]);

  // 按"天索引 0~6"分组;dayIdx 用本地时区计算
  const tasksByDay = useMemo(() => {
    const map: ScheduledTask[][] = Array.from({ length: 7 }, () => []);
    const dayMs = 86400000;
    for (const t of tasks ?? []) {
      const due = new Date(t.dueAt);
      // 用本地时区的"日界"算 idx,避免跨时区漂移
      const dayIdx = Math.floor(
        (new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() -
          new Date(
            new Date(weekStartMs).getFullYear(),
            new Date(weekStartMs).getMonth(),
            new Date(weekStartMs).getDate()
          ).getTime()) /
          dayMs
      );
      if (dayIdx >= 0 && dayIdx < 7) {
        map[dayIdx].push(t);
      }
    }
    for (const arr of map) {
      arr.sort((a, b) => a.dueAt - b.dueAt);
    }
    return map;
  }, [weekStartMs, tasks]);

  // 今天的 key(本地时区)
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden bg-bg-base">
      {days.map((day, i) => {
        const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
        const isToday = dayKey === todayKey;
        const isWeekend = i >= 5; // 周六 / 周日
        const isLastWeekday = i === 4; // 周五 → 周末的主分隔线
        const dayTasks = tasksByDay[i];

        return (
          <div
            key={i}
            className={cn(
              "flex flex-col min-h-[540px] border-r border-border last:border-r-0",
              isWeekend && "bg-bg-base/60",
              // 中间一根主线:周五右侧加粗,作为工作日/周末的主分隔
              isLastWeekday && "border-r-2 border-r-border-strong"
            )}
          >
            {/* 列头 */}
            <div
              className={cn(
                "px-2 py-2 border-b border-border text-center shrink-0",
                isToday ? "bg-accent-blue/10" : "bg-bg-panel"
              )}
            >
              <div
                className={cn(
                  "text-[11px] font-mono uppercase tracking-wide",
                  isToday ? "text-accent-blue" : "text-text-muted"
                )}
              >
                {DAY_NAMES_CN[i]}
              </div>
              <div
                className={cn(
                  "text-sm font-semibold mt-0.5 font-mono",
                  isToday ? "text-accent-blue" : "text-text-primary"
                )}
              >
                {day.getMonth() + 1}/{day.getDate()}
              </div>
            </div>

            {/* 列体 */}
            <div className="flex-1 p-2 flex flex-col min-h-0">
              {dayTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-xs gap-2">
                  <div>暂无任务</div>
                  <button
                    onClick={() => onSlotClick(day.getTime())}
                    className="text-accent-blue hover:underline text-xs"
                  >
                    + 添加
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 flex-1 overflow-y-auto">
                    {dayTasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onClick={() => onTaskClick(task)}
                        isRightEdge={i >= 5}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => onSlotClick(day.getTime())}
                    className="mt-2 w-full text-[11px] text-text-muted hover:text-accent-blue py-1 border border-dashed border-border hover:border-accent-blue/50 rounded transition-colors shrink-0"
                  >
                    + 添加
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

function TaskCard({
  task,
  onClick,
  isRightEdge,
}: {
  task: ScheduledTask;
  onClick: () => void;
  isRightEdge: boolean;
}) {
  const status: string = task.status ?? "pending";
  const priority: string = task.priority ?? "medium";

  const isDone = status === "done";
  const isCancelled = status === "cancelled";
  const isInProgress = status === "in_progress";
  const isFinished = isDone || isCancelled;

  // priority → 左 border 颜色
  const priorityBorderColor = {
    high: "border-l-accent-red",
    medium: "border-l-accent-amber",
    low: "border-l-text-muted",
  }[priority] ?? "border-l-accent-amber";

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={cn(
          "relative w-full text-left pl-3 pr-2 py-1.5 rounded-lg border transition-all",
          "bg-bg-panel hover:bg-bg-hover",
          // 左 border:priority 主色(done/cancelled 时改 muted / red)
          "border-l-2",
          isCancelled
            ? "border-l-accent-red"
            : isDone
            ? "border-l-text-muted"
            : priorityBorderColor,
          // 卡片外框:按 status 切换
          isInProgress && "border border-accent-blue/50 bg-accent-blue/5",
          !isInProgress && !isFinished && "border border-border",
          isDone && "border border-text-muted/30",
          isCancelled && "border border-dashed border-accent-red/40",
          isDone && "opacity-60",
          isCancelled && "opacity-50"
        )}
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className={cn(
              "text-[11px] font-mono shrink-0",
              isFinished
                ? "text-text-muted line-through"
                : "text-text-secondary"
            )}
          >
            {formatTime(task.dueAt)}
          </span>
          <span
            className={cn(
              "text-xs truncate flex-1 min-w-0",
              isFinished
                ? "text-text-muted line-through"
                : isInProgress
                ? "text-accent-blue"
                : "text-text-primary"
            )}
            title={task.title}
          >
            {task.title}
          </span>
        </div>
      </button>

      {/* hover 浮层:description + status / priority / category */}
      <div
        className={cn(
          "absolute top-full mt-1 z-20 hidden group-hover:block",
          "w-64 max-w-[calc(100vw-2rem)] bg-bg-active border border-border-strong",
          "rounded-lg shadow-2xl p-3 text-xs pointer-events-none",
          isRightEdge ? "right-0" : "left-0"
        )}
      >
        <div className="font-medium text-text-primary mb-1.5 break-words">
          {task.title}
        </div>
        {task.description && (
          <div className="text-text-secondary mb-2 whitespace-pre-wrap break-words leading-relaxed">
            {task.description}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 items-center">
          <StatusBadge status={status} />
          {priority && <PriorityBadge priority={priority} />}
          {task.category && (
            <span className="px-1.5 py-0.5 rounded bg-bg-base text-text-muted text-[10px] font-mono">
              {task.category}
            </span>
          )}
          {task.durationMinutes ? (
            <span className="px-1.5 py-0.5 rounded bg-bg-base text-text-muted text-[10px] font-mono">
              {task.durationMinutes}m
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "待办", cls: "bg-bg-base text-text-secondary" },
    in_progress: { label: "进行中", cls: "bg-accent-blue/20 text-accent-blue" },
    done: { label: "已完成", cls: "bg-text-muted/20 text-text-muted" },
    cancelled: { label: "已取消", cls: "bg-accent-red/20 text-accent-red" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-mono font-medium",
        s.cls
      )}
    >
      {s.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: "高", cls: "text-accent-red" },
    medium: { label: "中", cls: "text-accent-amber" },
    low: { label: "低", cls: "text-text-muted" },
  };
  const p = map[priority] ?? map.medium;
  return (
    <span className={cn("text-[10px] font-mono", p.cls)}>
      ● 优先级 {p.label}
    </span>
  );
}
