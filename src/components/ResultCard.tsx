"use client";

import { cn, relativeTime } from "@/lib/utils";

/**
 * 搜索结果类型
 *
 * 优先用 Convex 生成的 Doc<"searchDocuments">;
 * _generated/ 还没产出时(没跑 npx convex dev),降级到 any 避免编译失败。
 */
type SearchResult = any;

export interface ResultCardProps {
  result: SearchResult;
  query: string;
}

// ─────────────────────────────────────────────────────────────
// Source → 视觉映射(和 SearchBar 的 chip 保持一致)
// ─────────────────────────────────────────────────────────────
const SOURCE_META: Record<
  string,
  { label: string; className: string; hrefPrefix?: string; external?: boolean }
> = {
  memory: {
    label: "Memory",
    className: "bg-accent-cyan/15 text-accent-cyan",
  },
  doc: {
    label: "Doc",
    className: "bg-accent-blue/15 text-accent-blue",
    external: true,
  },
  activity: {
    label: "Activity",
    className: "bg-accent-purple/15 text-accent-purple",
    hrefPrefix: "/activity#",
  },
  task: {
    label: "Task",
    className: "bg-accent-amber/15 text-accent-amber",
    hrefPrefix: "/calendar#",
  },
};

const BODY_PREVIEW_MAX = 280;

// ─────────────────────────────────────────────────────────────
// 安全的 HTML escape(防 XSS)
// ─────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 把 body 里的 query 关键词包成 <mark>
 *
 * 实现要点:
 *  1. 先 escape 原始 body(防 XSS)
 *  2. 再用 RegExp 替换为带样式的 <mark> 标签
 *  3. query 自身也做 escape,避免注入到 RegExp
 */
function highlight(text: string, query: string): string {
  const safe = escapeHtml(text);
  const q = query.trim();
  if (!q) return safe;

  // RegExp meta chars: . * + ? ^ $ { } ( ) | [ ] \
  const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escapedQuery})`, "gi");
  return safe.replace(
    re,
    '<mark class="bg-accent-amber/20 text-accent-amber font-semibold px-0.5 rounded">$1</mark>'
  );
}

function previewBody(body: string, max: number = BODY_PREVIEW_MAX): string {
  if (!body) return "";
  return body.length > max ? body.slice(0, max).trimEnd() + "…" : body;
}

// ─────────────────────────────────────────────────────────────
// 根据 source 推断详情链接
// ─────────────────────────────────────────────────────────────
function sourceHref(
  source: string,
  sourceId: string
): { href: string; external: boolean } | null {
  const meta = SOURCE_META[source];
  if (!meta) return null;
  if (meta.external) {
    return { href: sourceId, external: true };
  }
  if (meta.hrefPrefix) {
    return { href: `${meta.hrefPrefix}${sourceId}`, external: false };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
export function ResultCard({ result, query }: ResultCardProps) {
  const meta = SOURCE_META[result.source] ?? {
    label: result.source ?? "unknown",
    className: "bg-bg-active text-text-secondary",
  };

  const link = sourceHref(result.source, result.sourceId);
  const bodyHtml = highlight(previewBody(result.body ?? ""), query);

  return (
    <article
      className={cn(
        "bg-bg-panel border border-border rounded-lg p-5",
        "hover:border-border-strong hover:bg-bg-hover/40",
        "transition-colors"
      )}
    >
      {/* Header: badge · title · time */}
      <header className="flex items-center gap-3 mb-3">
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider shrink-0",
            meta.className
          )}
        >
          {meta.label}
        </span>
        <h3 className="text-[15px] font-medium text-text-primary truncate flex-1 min-w-0">
          {result.title || "(无标题)"}
        </h3>
        <time
          dateTime={new Date(result.timestamp).toISOString()}
          className="text-xs text-text-muted font-mono shrink-0 tabular-nums"
          title={new Date(result.timestamp).toLocaleString("zh-CN")}
        >
          {relativeTime(result.timestamp)}
        </time>
      </header>

      {/* Body: 高亮摘要 */}
      <div
        className={cn(
          "text-sm text-text-secondary leading-relaxed",
          "line-clamp-3 mb-3 break-words"
        )}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {/* Footer: tags + sourceId */}
      <footer className="flex items-center gap-2 flex-wrap">
        {result.tags?.slice(0, 6).map((tag: string) => (
          <span
            key={tag}
            className="text-[11px] font-mono px-1.5 py-0.5 bg-bg-active text-text-muted rounded"
          >
            #{tag}
          </span>
        ))}

        {link && (
          <a
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className={cn(
              "ml-auto text-[11px] font-mono truncate max-w-[260px]",
              "text-text-muted hover:text-accent-blue transition-colors",
              "flex items-center gap-1"
            )}
            title={result.sourceId}
          >
            <span className="truncate">{result.sourceId}</span>
            {link.external ? (
              <span aria-hidden className="shrink-0">↗</span>
            ) : (
              <span aria-hidden className="shrink-0">→</span>
            )}
          </a>
        )}
      </footer>
    </article>
  );
}
