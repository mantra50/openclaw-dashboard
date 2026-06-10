"use client";

import { useCallback, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { weekStart } from "@/lib/utils";
import { CalendarWeek } from "@/components/CalendarWeek";
import { TaskModal } from "@/components/TaskModal";

const DAY_MS = 7 * 86400000;

export default function CalendarPage() {
  const [weekStartMs, setWeekStartMs] = useState<number>(() => weekStart());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<
    | (Partial<{
        _id: string;
        title: string;
        description: string;
        dueAt: number;
        durationMinutes: number;
        status: "pending" | "in_progress" | "done" | "cancelled";
        priority: "low" | "medium" | "high";
        category: string;
      }> & { _id?: string })
    | null
  >(null);

  // 拉这一周的任务(listForWeek 在 loading 时返回 undefined)
  const tasks = useQuery(api.scheduledTasks.listForWeek, { weekStartMs });

  /* ── 导航 ──────────────────────────────────────────────── */
  const goPrev = useCallback(() => {
    setWeekStartMs((ms) => ms - DAY_MS);
  }, []);
  const goNext = useCallback(() => {
    setWeekStartMs((ms) => ms + DAY_MS);
  }, []);
  const goToday = useCallback(() => {
    setWeekStartMs(weekStart());
  }, []);

  /* ── modal 触发 ────────────────────────────────────────── */
  const openCreate = useCallback((prefillDueAt?: number) => {
    if (prefillDueAt !== undefined) {
      setModalInitial({ dueAt: prefillDueAt });
    } else {
      // 默认:下一个整点
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() + 1);
      setModalInitial({ dueAt: d.getTime() });
    }
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((task: any) => {
    setModalInitial(task);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    // 延迟清空,避免关闭动画期间表单值闪一下
    setTimeout(() => setModalInitial(null), 150);
  }, []);

  /* ── 顶部周标题 ────────────────────────────────────────── */
  const start = new Date(weekStartMs);
  const end = new Date(weekStartMs + 6 * 86400000);
  const weekHeader =
    start.getMonth() === end.getMonth()
      ? `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getDate()}日`
      : `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${
          end.getMonth() + 1
        }月${end.getDate()}日`;

  // 是否当前所在周(用于高亮"今日"按钮)
  const isCurrentWeek = weekStartMs === weekStart();

  return (
    <div className="p-8 max-w-[1600px]">
      {/* 顶部 */}
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Calendar</h1>
          <p className="text-sm text-text-secondary mt-1 font-mono">
            {weekHeader}
            {isCurrentWeek && (
              <span className="ml-2 text-accent-blue text-xs">· 本周</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 周导航 */}
          <div className="flex items-center bg-bg-panel border border-border rounded-md overflow-hidden">
            <button
              onClick={goPrev}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover border-r border-border transition-colors"
              title="上一周"
            >
              ←
            </button>
            <button
              onClick={goToday}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors border-r border-border",
                isCurrentWeek
                  ? "text-accent-blue bg-accent-blue/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              )}
            >
              今日
            </button>
            <button
              onClick={goNext}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              title="下一周"
            >
              →
            </button>
          </div>

          {/* 添加任务 */}
          <button
            onClick={() => openCreate()}
            className="bg-accent-blue hover:bg-accent-blue/90 text-white text-sm px-4 py-1.5 rounded-md font-medium transition-colors"
          >
            + 添加任务
          </button>
        </div>
      </header>

      {/* 周视图 */}
      {tasks === undefined ? (
        <div className="border border-border rounded-lg bg-bg-panel min-h-[540px] flex items-center justify-center text-text-muted text-sm">
          加载中…
        </div>
      ) : (
        <CalendarWeek
          weekStartMs={weekStartMs}
          tasks={tasks}
          onTaskClick={openEdit}
          onSlotClick={(dateMs) => {
            // 点击空白格 / + 添加 → 预填日期(当天 9:00)
            const d = new Date(dateMs);
            d.setHours(9, 0, 0, 0);
            openCreate(d.getTime());
          }}
        />
      )}

      {/* 底部小提示 */}
      <p className="text-xs text-text-muted mt-4 font-mono">
        点击任务卡片编辑 · 点击空白格或 "+ 添加" 新建(预填当天) · ESC 关闭弹窗
      </p>

      {/* 弹窗 */}
      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        initial={modalInitial ?? undefined}
      />
    </div>
  );
}

/* ── 局部小工具 ──────────────────────────────────────────── */
function cn(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}
