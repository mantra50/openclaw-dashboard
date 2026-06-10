"use client";

import { useEffect } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { cn, formatTime, relativeTime } from "@/lib/utils";

type Activity = Doc<"activities">;

/**
 * 活动详情 Modal
 *
 * 显示完整 activity 数据:title / detail / 全部 meta 字段 / 原始 JSON
 * ESC 或 backdrop 点击关闭
 */
export function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: Activity | null;
  onClose: () => void;
}) {
  // ESC 关闭
  useEffect(() => {
    if (!activity) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activity, onClose]);

  if (!activity) return null;

  const {
    _id,
    _creationTime,
    type,
    title,
    detail,
    source,
    agent,
    channel,
    sessionId,
    durationMs,
    status,
    timestamp,
    meta,
  } = activity;

  const fmtTs = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString("zh-CN")} ${formatTime(ts, true)}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-bg-panel border border-border-strong rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge badge-${type}`}>{type}</span>
              {status && (
                <span className="flex items-center gap-1 text-xs font-mono text-text-muted">
                  <span className={`status-dot status-dot-${status}`} />
                  {status}
                </span>
              )}
              <span className="text-xs font-mono text-text-muted">
                {relativeTime(timestamp)}
              </span>
            </div>
            <h2 className="text-lg font-semibold break-words">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-bg-hover shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Detail */}
          {detail && (
            <section>
              <h3 className="text-xs font-mono uppercase tracking-wide text-text-muted mb-2">
                Detail
              </h3>
              <div className="bg-bg-base border border-border rounded p-4 text-sm whitespace-pre-wrap break-words font-mono">
                {detail}
              </div>
            </section>
          )}

          {/* Meta grid */}
          <section>
            <h3 className="text-xs font-mono uppercase tracking-wide text-text-muted mb-2">
              Meta
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <MetaRow label="Agent" value={agent} />
              <MetaRow label="Source" value={source} />
              <MetaRow label="Channel" value={channel} />
              <MetaRow label="Status" value={status} />
              <MetaRow
                label="Timestamp"
                value={fmtTs(timestamp)}
                mono
              />
              <MetaRow
                label="Created"
                value={fmtTs(_creationTime)}
                mono
              />
              <MetaRow
                label="Duration"
                value={
                  durationMs != null
                    ? `${durationMs} ms (${(durationMs / 1000).toFixed(2)}s)`
                    : null
                }
                mono
              />
              <MetaRow label="Session" value={sessionId} mono />
              <MetaRow
                label="Activity ID"
                value={_id}
                mono
                fullWidth
              />
            </dl>
          </section>

          {/* Raw meta JSON (if present) */}
          {meta !== undefined && meta !== null && (
            <section>
              <h3 className="text-xs font-mono uppercase tracking-wide text-text-muted mb-2">
                Raw Meta
              </h3>
              <pre className="bg-bg-base border border-border rounded p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(meta, null, 2)}
              </pre>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border text-xs text-text-muted font-mono flex items-center justify-between">
          <span>id: {_id.slice(0, 12)}…</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(activity, null, 2));
            }}
            className="text-accent-blue hover:underline"
          >
            复制完整 JSON
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
  fullWidth,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  fullWidth?: boolean;
}) {
  const display = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <>
      <dt className="text-text-muted text-xs font-mono uppercase tracking-wide pt-1">
        {label}
      </dt>
      <dd
        className={cn(
          "text-text-primary break-words",
          mono && "font-mono text-xs",
          fullWidth && "col-span-1"
        )}
      >
        {display}
      </dd>
    </>
  );
}