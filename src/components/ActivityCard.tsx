"use client";

import { useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { cn, relativeTime, formatTime } from "@/lib/utils";

type Activity = Doc<"activities">;

export function ActivityCard({
  activity,
  onClick,
}: {
  activity: Activity;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const {
    type,
    title,
    detail,
    agent,
    channel,
    sessionId,
    durationMs,
    status,
    timestamp,
  } = activity;

  const hasDetail = !!detail && detail.trim().length > 0;

  const meta = [
    agent,
    channel,
    durationMs != null ? `${durationMs}ms` : null,
    sessionId ? sessionId.slice(0, 8) : null,
  ].filter(Boolean) as string[];

  return (
    <article className="group bg-bg-panel border-b border-border px-5 py-3.5 hover:bg-bg-hover transition-colors">
      <div className="flex items-start gap-3">
        <span className={cn("badge shrink-0 mt-0.5", `badge-${type}`)}>
          {type}
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-sm text-text-primary leading-snug break-words">
            {title}
          </div>

          {hasDetail && (
            <>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-text-secondary hover:text-text-primary"
              >
                <span>{expanded ? "▾" : "▸"}</span>
                <span>{expanded ? "收起" : "详情"}</span>
              </button>
              {expanded && (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-bg-base p-2.5 font-mono text-xs text-text-secondary">
                  {detail}
                </pre>
              )}
            </>
          )}

          {meta.length > 0 && (
            <div className="mt-1.5 font-mono text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
              {meta.join(" · ")}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div
            className="whitespace-nowrap font-mono text-xs text-text-muted"
            title={formatTime(timestamp, true)}
          >
            {relativeTime(timestamp)}
          </div>
          <div className="mt-1.5 flex justify-end items-center gap-2">
            <span
              className={cn("status-dot", `status-dot-${status ?? "info"}`)}
              title={status ?? "info"}
            />
            {onClick && (
              <button
                onClick={onClick}
                className="text-xs font-mono text-text-muted hover:text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity"
                title="查看完整元数据"
              >
                完整 →
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
