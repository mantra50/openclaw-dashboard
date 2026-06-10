"use client";

import { Suspense, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { SearchBar } from "@/components/SearchBar";
import { ResultCard } from "@/components/ResultCard";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Source 元数据(和 SearchBar / ResultCard 保持一致)
// ─────────────────────────────────────────────────────────────
const ALL_SOURCES = ["memory", "doc", "activity", "task"] as const;
type Source = (typeof ALL_SOURCES)[number];

const SOURCE_META: Record<Source, { label: string; dotClass: string; textClass: string }> = {
  memory:   { label: "Memory",   dotClass: "bg-accent-cyan",   textClass: "text-accent-cyan" },
  doc:      { label: "Doc",      dotClass: "bg-accent-blue",   textClass: "text-accent-blue" },
  activity: { label: "Activity", dotClass: "bg-accent-purple", textClass: "text-accent-purple" },
  task:     { label: "Task",     dotClass: "bg-accent-amber",  textClass: "text-accent-amber" },
};

const BROWSE_LIMIT = 20;
const SEARCH_LIMIT = 50;

// ─────────────────────────────────────────────────────────────
// 顶层:必须用 Suspense 包裹,因为内部用了 useSearchParams
// (Next.js 14 要求 useSearchParams 的消费者被 Suspense 边界保护)
// ─────────────────────────────────────────────────────────────
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageFallback() {
  return (
    <div className="p-8 max-w-7xl">
      <div className="h-32 bg-bg-panel border border-border rounded-xl animate-pulse" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function SearchPageInner() {
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const urlSrc = searchParams.get("src");
  const initialSources: string[] = urlSrc
    ? urlSrc === "none"
      ? []
      : urlSrc.split(",").filter(Boolean)
    : [...ALL_SOURCES];

  // 本地 state,由 SearchBar 的 onChange 驱动
  // (URL 是 source of truth;SearchBar 防抖后写 URL 并通知这里)
  const [query, setQuery] = useState(urlQ);
  const [sources, setSources] = useState<string[]>(initialSources);

  const isSearchMode = query.trim().length > 0;
  const validSources = sources.filter((s): s is Source =>
    (ALL_SOURCES as readonly string[]).includes(s)
  );

  // ── 搜索模式 ──
  // Convex 的 searchIndex filterFields 一次只支持单值 source;
  // 多选时后端不传 source,客户端再过滤
  const singleSource = sources.length === 1 ? sources[0] : undefined;
  const searchArgs = isSearchMode
    ? { query, limit: SEARCH_LIMIT, source: singleSource }
    : "skip";
  const rawResults = useQuery(api.search.search, searchArgs as any);

  const searchResults = useMemo(() => {
    if (!isSearchMode) return [];
    if (rawResults === undefined) return undefined; // 加载中
    if (sources.length <= 1) return rawResults;
    return rawResults.filter((r: any) => sources.includes(r.source));
  }, [isSearchMode, rawResults, sources]);

  // ── 浏览模式:4 个并行 listBySource ──
  const browseQueryFor = (src: Source) =>
    !isSearchMode && (sources.length === 0 || sources.includes(src))
      ? { source: src, limit: BROWSE_LIMIT }
      : "skip";

  const memoryList = useQuery(
    api.search.listBySource,
    browseQueryFor("memory") as any
  );
  const docList = useQuery(
    api.search.listBySource,
    browseQueryFor("doc") as any
  );
  const activityList = useQuery(
    api.search.listBySource,
    browseQueryFor("activity") as any
  );
  const taskList = useQuery(
    api.search.listBySource,
    browseQueryFor("task") as any
  );

  const browseGroups = useMemo(() => {
    if (isSearchMode) return [];
    const map: Record<Source, any[] | undefined> = {
      memory: memoryList,
      doc: docList,
      activity: activityList,
      task: taskList,
    };
    return validSources
      .map((src) => ({ source: src, items: map[src] }))
      .filter((g) => g.items !== undefined || sources.length === 0);
  }, [isSearchMode, validSources, sources.length, memoryList, docList, activityList, taskList]);

  // ── Facet 计数 ──
  const facetCounts = useMemo(() => {
    const counts: Record<Source, number> = { memory: 0, doc: 0, activity: 0, task: 0 };
    if (isSearchMode) {
      for (const r of searchResults ?? []) {
        if (counts[r.source as Source] !== undefined) counts[r.source as Source]++;
      }
    } else {
      counts.memory = memoryList?.length ?? 0;
      counts.doc = docList?.length ?? 0;
      counts.activity = activityList?.length ?? 0;
      counts.task = taskList?.length ?? 0;
    }
    return counts;
  }, [isSearchMode, searchResults, memoryList, docList, activityList, taskList]);

  const totalCount = isSearchMode
    ? searchResults?.length ?? 0
    : Object.values(facetCounts).reduce((a, b) => a + b, 0);

  // ── 错误态 ──
  // useQuery 在 Convex 报错时会抛到 ErrorBoundary;这里只处理"空"和"加载"
  // 如果上游需要,可以加 try/catch 包 useQuery 的 args,但 Convex 的 query
  // 失败会直接 throw,所以让 ErrorBoundary 接住比较干净。

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Global Search</h1>
        <p className="text-text-secondary mt-1 text-sm">
          联邦搜索 · memory / docs / activities / tasks
          <span className="ml-2 text-text-muted font-mono text-xs">
            ⌘K 聚焦
          </span>
        </p>
      </header>

      <SearchBar
        defaultQuery={urlQ}
        defaultSources={initialSources}
        onChange={(q, s) => {
          setQuery(q);
          setSources(s);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6 mt-6">
        {/* ── 主区 ── */}
        <div className="min-w-0">
          {isSearchMode ? (
            <SearchResults
              query={query}
              results={searchResults}
              sources={sources}
            />
          ) : (
            <BrowseGroups groups={browseGroups} hasNoSources={sources.length === 0} />
          )}
        </div>

        {/* ── Facet Sidebar ── */}
        <aside className="space-y-4">
          <div className="bg-bg-panel border border-border rounded-lg p-4 sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
                Facets
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                {isSearchMode ? "匹配数" : "总数"}
              </div>
            </div>
            <div className="space-y-1">
              {ALL_SOURCES.map((s) => {
                const meta = SOURCE_META[s];
                const count = facetCounts[s];
                const active = sources.includes(s);
                return (
                  <div
                    key={s}
                    className={cn(
                      "flex items-center justify-between gap-2 px-2 py-1.5 rounded",
                      "transition-colors",
                      active ? "bg-bg-active" : "opacity-60"
                    )}
                    title={active ? "已包含在结果中" : "未启用此 source"}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          meta.dotClass,
                          active ? "opacity-100" : "opacity-30"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm truncate",
                          active ? "text-text-primary" : "text-text-muted line-through"
                        )}
                      >
                        {meta.label}
                      </span>
                    </span>
                    <span className="text-xs font-mono tabular-nums text-text-secondary shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border mt-3 pt-3 flex items-center justify-between text-xs text-text-muted font-mono">
              <span>合计</span>
              <span className="tabular-nums text-text-primary">{totalCount}</span>
            </div>
          </div>

          <div className="text-[10px] text-text-muted font-mono leading-relaxed px-1">
            <div>· 输入即搜索,300ms 防抖</div>
            <div>· URL 实时同步 (?q=…&src=…)</div>
            <div>· ⌘K / Ctrl+K 聚焦</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 子组件:搜索结果列表
// ─────────────────────────────────────────────────────────────
function SearchResults({
  query,
  results,
  sources,
}: {
  query: string;
  results: any[] | undefined;
  sources: string[];
}) {
  if (results === undefined) {
    return <StateBlock>搜索 "{truncate(query, 40)}" 中…</StateBlock>;
  }
  if (results.length === 0) {
    return (
      <StateBlock>
        <div className="text-base mb-2">没有匹配 "{truncate(query, 40)}" 的结果</div>
        <div className="text-xs text-text-muted font-mono">
          {sources.length === 0
            ? "当前没选任何 source"
            : "试试更短的关键词,或切换 source"}
        </div>
      </StateBlock>
    );
  }
  return (
    <div className="space-y-3">
      <div className="text-xs text-text-muted font-mono px-1">
        {results.length} 条结果
      </div>
      <ul className="space-y-3">
        {results.map((r) => (
          <li key={r._id}>
            <ResultCard result={r} query={query} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 子组件:浏览分组
// ─────────────────────────────────────────────────────────────
function BrowseGroups({
  groups,
  hasNoSources,
}: {
  groups: { source: Source; items: any[] | undefined }[];
  hasNoSources: boolean;
}) {
  if (hasNoSources) {
    return (
      <StateBlock>
        <div className="text-base mb-2">没选任何 source</div>
        <div className="text-xs text-text-muted font-mono">
          在搜索栏里至少点亮一个再来看
        </div>
      </StateBlock>
    );
  }
  return (
    <div className="space-y-8">
      {groups.map((g) => {
        const meta = SOURCE_META[g.source];
        return (
          <section key={g.source}>
            <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-border">
              <h2
                className={cn(
                  "text-sm font-mono uppercase tracking-wider font-semibold",
                  meta.textClass
                )}
              >
                {meta.label}
              </h2>
              <span className="text-xs text-text-muted font-mono tabular-nums">
                {g.items === undefined ? "加载中…" : `${g.items.length} 条`}
              </span>
            </div>
            {g.items === undefined ? (
              <div className="text-sm text-text-muted py-4 px-1">加载 {meta.label}…</div>
            ) : g.items.length === 0 ? (
              <div className="text-sm text-text-muted py-6 text-center border border-dashed border-border rounded-lg">
                这个 source 暂时没有内容
              </div>
            ) : (
              <ul className="space-y-3">
                {g.items.map((r) => (
                  <li key={r._id}>
                    <ResultCard result={r} query="" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function StateBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-panel border border-border rounded-lg py-12 px-6 text-center text-text-muted">
      {children}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
