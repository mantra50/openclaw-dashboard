"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * 四个联邦 source: memory / doc / activity / task
 * 颜色和 ResultCard 的 badge 保持一致
 */
const ALL_SOURCES = [
  { value: "memory", label: "Memory", dot: "bg-accent-cyan", text: "text-accent-cyan" },
  { value: "doc", label: "Doc", dot: "bg-accent-blue", text: "text-accent-blue" },
  { value: "activity", label: "Activity", dot: "bg-accent-purple", text: "text-accent-purple" },
  { value: "task", label: "Task", dot: "bg-accent-amber", text: "text-accent-amber" },
] as const;

const DEBOUNCE_MS = 300;

export interface SearchBarProps {
  /** 来自 URL 的初始 query */
  defaultQuery?: string;
  /** 来自 URL 的初始 source 列表,默认全选 */
  defaultSources?: string[];
  /** 防抖后回调,让父组件触发实际查询 */
  onChange: (query: string, sources: string[]) => void;
}

export function SearchBar({
  defaultQuery = "",
  defaultSources,
  onChange,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(defaultQuery);
  const [sources, setSources] = useState<string[]>(
    defaultSources ?? ALL_SOURCES.map((s) => s.value)
  );

  // ─────────────────────────────────────────────────────────────
  // ⌘K / Ctrl+K 聚焦
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 防抖:300ms 后同步 URL + 通知父组件
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      // q
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }

      // src:全选时清空参数,保持 URL 干净
      if (sources.length === ALL_SOURCES.length) {
        params.delete("src");
      } else if (sources.length === 0) {
        params.set("src", "none");
      } else {
        params.set("src", sources.join(","));
      }

      const qs = params.toString();
      router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
      onChange(query, sources);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // searchParams 和 onChange 故意排除,避免每次 render 都重置定时器
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sources]);

  // ─────────────────────────────────────────────────────────────
  // 当 URL 被外部修改(浏览器后退 / 前进)时,把状态拉回同步
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    const urlSrc = searchParams.get("src");
    const nextSources = urlSrc
      ? urlSrc === "none"
        ? []
        : urlSrc.split(",").filter(Boolean)
      : ALL_SOURCES.map((s) => s.value);

    if (urlQ !== query) setQuery(urlQ);
    if (nextSources.join(",") !== sources.join(",")) setSources(nextSources);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const toggleSource = (value: string) => {
    setSources((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  return (
    <div className="bg-bg-panel border border-border rounded-xl p-4">
      {/* 主输入行 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg pointer-events-none">
            ◎
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 memory / docs / activities / tasks…"
            spellCheck={false}
            autoComplete="off"
            className={cn(
              "w-full bg-bg-base border border-border-strong rounded-lg",
              "pl-10 pr-10 py-3 text-base",
              "placeholder:text-text-muted text-text-primary",
              "focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30",
              "transition-colors"
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="清除搜索"
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "w-6 h-6 flex items-center justify-center rounded",
                "text-text-muted hover:text-text-primary hover:bg-bg-hover",
                "text-lg leading-none transition-colors"
              )}
            >
              ×
            </button>
          )}
        </div>
        <kbd
          className={cn(
            "hidden sm:inline-flex items-center gap-1 px-2 py-1.5",
            "text-xs font-mono text-text-muted",
            "bg-bg-base border border-border rounded"
          )}
        >
          ⌘K
        </kbd>
      </div>

      {/* Source 多选 chip 行 */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider mr-1">
          Source
        </span>
        {ALL_SOURCES.map((s) => {
          const active = sources.includes(s.value);
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleSource(s.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-mono border transition-colors",
                "flex items-center gap-1.5",
                active
                  ? "bg-bg-active border-border-strong text-text-primary"
                  : "bg-transparent border-border text-text-muted hover:border-border-strong hover:text-text-secondary"
              )}
              aria-pressed={active}
            >
              <span
                className={cn(
                  "inline-block w-1.5 h-1.5 rounded-full transition-opacity",
                  s.dot,
                  active ? "opacity-100" : "opacity-40"
                )}
              />
              {s.label}
            </button>
          );
        })}

        <span className="ml-auto text-xs text-text-muted font-mono">
          {sources.length}/{ALL_SOURCES.length} 选中
        </span>
      </div>
    </div>
  );
}
