"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ActivityCard } from "@/components/ActivityCard";
import { cn } from "@/lib/utils";

type TimeRange = "today" | "yesterday" | "all";

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "today", label: "今天" },
  { value: "yesterday", label: "昨天" },
  { value: "all", label: "全部" },
];

const ACTIVITY_TYPES = [
  "tool_call",
  "task_complete",
  "doc_created",
  "file_edit",
  "command_run",
  "error",
  "note",
  "conversation",
] as const;

function dayBounds(d: Date): { startMs: number; endMs: number } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function getRangeMs(r: Exclude<TimeRange, "all">) {
  const now = new Date();
  if (r === "today") return dayBounds(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return dayBounds(y);
}

export default function ActivityPage() {
  const [range, setRange] = useState<TimeRange>("today");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(ACTIVITY_TYPES),
  );

  const bounds = range === "all" ? null : getRangeMs(range);

  const allQuery = useQuery(
    api.activities.list,
    range === "all" ? { limit: 200 } : "skip",
  );
  const rangeQuery = useQuery(
    api.activities.listByTimeRange,
    bounds ?? "skip",
  );

  const raw = range === "all" ? allQuery : rangeQuery;

  const filtered = useMemo(() => {
    if (!raw) return undefined;
    try {
      if (selected.size === 0) return [];
      return raw.filter((a) => selected.has(a.type));
    } catch {
      return [];
    }
  }, [raw, selected]);

  const toggleType = (t: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div className="flex h-full">
      {/* 左侧:类型多选 filter */}
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-border bg-bg-panel">
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-wide text-text-muted">
              类型
            </div>
            <button
              onClick={() => setSelected(new Set(ACTIVITY_TYPES))}
              className="font-mono text-xs text-text-muted hover:text-text-secondary"
              title="全选"
            >
              ↻
            </button>
          </div>
          <ul className="space-y-1.5">
            {ACTIVITY_TYPES.map((t) => {
              const checked = selected.has(t);
              return (
                <li key={t}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(t)}
                      className="cursor-pointer accent-accent-blue"
                    />
                    <span
                      className={cn(
                        "badge",
                        `badge-${t}`,
                        !checked && "opacity-35",
                      )}
                    >
                      {t}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto">
          {/* sticky header:时间过滤 + 实时 dot */}
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg-panel px-6 py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">Activity Feed</h1>
              <span className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
                <span className="live-dot" />
                <span>实时</span>
              </span>
              {filtered && filtered.length > 0 && (
                <span className="font-mono text-xs text-text-muted">
                  · {filtered.length} 条
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border bg-bg-base p-0.5">
              {TIME_OPTIONS.map((opt) => {
                const active = range === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRange(opt.value)}
                    className={cn(
                      "rounded px-3 py-1 font-mono text-xs transition-colors",
                      active
                        ? "bg-bg-active text-text-primary"
                        : "text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </header>

          {filtered === undefined ? (
            <ActivitySkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              reason={
                selected.size === 0
                  ? "no-types"
                  : !raw || raw.length === 0
                    ? "no-data"
                    : "no-match"
              }
            />
          ) : (
            <div>
              {filtered.map((a) => (
                <ActivityCard key={a._id} activity={a} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border px-5 py-4"
        >
          <div className="h-5 w-20 animate-pulse rounded bg-bg-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-bg-hover" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-bg-hover" />
          </div>
          <div className="h-3 w-12 animate-pulse rounded bg-bg-hover" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  reason,
}: {
  reason: "no-data" | "no-match" | "no-types";
}) {
  const messages: Record<typeof reason, { title: string; hint: string }> = {
    "no-data": {
      title: "还没有 activity",
      hint: "agent 回话时会自动写入",
    },
    "no-match": {
      title: "没有匹配的 activity",
      hint: "调整左侧类型过滤器或时间范围",
    },
    "no-types": {
      title: "没有选中任何类型",
      hint: "勾选至少一个类型,或点 ↻ 全选",
    },
  };
  const m = messages[reason];
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-3 font-mono text-4xl text-text-muted">∅</div>
      <div className="text-sm text-text-secondary">{m.title}</div>
      <div className="mt-2 font-mono text-xs text-text-muted">{m.hint}</div>
    </div>
  );
}
