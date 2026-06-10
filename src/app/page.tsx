"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../convex/_generated/api";
import { relativeTime } from "@/lib/utils";

export default function HomePage() {
  const stats = useQuery(api.activities.stats, { hours: 24 });
  const recent = useQuery(api.activities.list, { limit: 8 });
  const upcoming = useQuery(api.scheduledTasks.listUpcoming, { days: 7 });

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Mission Control</h1>
        <p className="text-text-secondary mt-1 text-sm">
          大王的实时状态盘 · Activity / Calendar / Search
        </p>
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="24h 活动总数" value={stats?.total ?? "—"} />
        <StatCard
          label="错误数"
          value={stats?.byStatus?.error ?? 0}
          tone={stats?.byStatus?.error ? "red" : undefined}
        />
        <StatCard
          label="未来 7 天任务"
          value={upcoming?.length ?? "—"}
          tone="blue"
        />
        <StatCard
          label="当前在线"
          value={<span className="live-dot" />}
        />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent activity */}
        <section className="bg-bg-panel border border-border rounded-lg">
          <div className="px-5 py-3 border-b border-border flex justify-between items-center">
            <h2 className="font-medium">最近活动</h2>
            <Link
              href="/activity"
              className="text-xs text-accent-blue hover:underline"
            >
              查看全部 →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {!recent && (
              <div className="px-5 py-8 text-center text-text-muted text-sm">
                加载中…
              </div>
            )}
            {recent && recent.length === 0 && (
              <div className="px-5 py-8 text-center text-text-muted text-sm">
                <div className="mb-2">还没有 activity 记录</div>
                <div className="text-xs font-mono">
                  agent 回话时会自动写入
                </div>
              </div>
            )}
            {recent?.map((a) => (
              <div key={a._id} className="px-5 py-3 hover:bg-bg-hover">
                <div className="flex items-start gap-3">
                  <span className={`badge badge-${a.type} shrink-0 mt-0.5`}>
                    {a.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{a.title}</div>
                    <div className="text-xs text-text-muted font-mono mt-0.5">
                      {relativeTime(a.timestamp)}
                      {a.channel && ` · ${a.channel}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Upcoming tasks */}
        <section className="bg-bg-panel border border-border rounded-lg">
          <div className="px-5 py-3 border-b border-border flex justify-between items-center">
            <h2 className="font-medium">未来 7 天</h2>
            <Link
              href="/calendar"
              className="text-xs text-accent-blue hover:underline"
            >
              日历 →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {!upcoming && (
              <div className="px-5 py-8 text-center text-text-muted text-sm">
                加载中…
              </div>
            )}
            {upcoming && upcoming.length === 0 && (
              <div className="px-5 py-8 text-center text-text-muted text-sm">
                <div className="mb-2">日历是空的</div>
                <div className="text-xs font-mono">
                  在对话里说"提醒我明天下午 3 点开会"
                </div>
              </div>
            )}
            {upcoming?.map((t) => (
              <div key={t._id} className="px-5 py-3 hover:bg-bg-hover">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{t.title}</div>
                    <div className="text-xs text-text-muted font-mono mt-0.5">
                      {new Date(t.dueAt).toLocaleString("zh-CN", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span className={`priority-${t.priority ?? "medium"} text-xs font-mono`}>
                    {t.priority === "high" ? "●" : t.priority === "low" ? "○" : "◐"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "blue" | "red" | "green";
}) {
  const valueClass =
    tone === "red"
      ? "text-accent-red"
      : tone === "blue"
      ? "text-accent-blue"
      : tone === "green"
      ? "text-accent-green"
      : "text-text-primary";
  return (
    <div className="bg-bg-panel border border-border rounded-lg px-5 py-4">
      <div className="text-xs text-text-muted font-mono uppercase tracking-wide">
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-2 ${valueClass}`}>{value}</div>
    </div>
  );
}