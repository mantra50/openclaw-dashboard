import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Mission Control 数据库 schema
 *
 * 三张核心表:
 *  - activities        自动上报的活动流(agent 每次回话自动写)
 *  - scheduledTasks    日历里的计划任务(对话 / Calendar UI 都能加)
 *  - searchDocuments   联邦搜索索引(memory / docs / activities / tasks)
 */

export default defineSchema({
  // ─────────────────────────────────────────────────────────────
  // Activity Feed: agent 每回合自动上报的动作记录
  // ─────────────────────────────────────────────────────────────
  activities: defineTable({
    timestamp: v.number(),          // unix ms
    type: v.string(),              // tool_call | task_complete | doc_created | file_edit | command_run | error | note | conversation
    title: v.string(),             // 一句话总结(< 120 字)
    detail: v.optional(v.string()), // 详情(markdown / 多行)
    source: v.string(),            // openclaw | codex | manual | ...
    agent: v.string(),             // "小八"
    channel: v.optional(v.string()), // feishu | codex | web | ...
    sessionId: v.optional(v.string()),
    durationMs: v.optional(v.number()), // 这个活动耗时
    status: v.optional(v.string()), // success | warning | error | info
    meta: v.optional(v.any()),     // 任意 metadata
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_type", ["type"])
    .index("by_agent", ["agent"])
    .index("by_status", ["status"]),

  // ─────────────────────────────────────────────────────────────
  // Scheduled Tasks: 日历视图的数据源
  // ─────────────────────────────────────────────────────────────
  scheduledTasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    dueAt: v.number(),                      // unix ms
    durationMinutes: v.optional(v.number()),
    status: v.string(),                     // pending | in_progress | done | cancelled
    priority: v.optional(v.string()),       // low | medium | high
    agent: v.optional(v.string()),
    category: v.optional(v.string()),       // work | personal | health | ...
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
  })
    .index("by_dueAt", ["dueAt"])
    .index("by_status", ["status"])
    .index("by_agent", ["agent"]),

  // ─────────────────────────────────────────────────────────────
  // Search Documents: 联邦搜索索引
  // body 字段建全文搜索索引,source 用于按来源过滤
  // ─────────────────────────────────────────────────────────────
  searchDocuments: defineTable({
    source: v.string(),            // memory | doc | activity | task
    sourceId: v.string(),          // 引用源(activities._id / path / etc)
    title: v.string(),
    body: v.string(),
    tags: v.optional(v.array(v.string())),
    timestamp: v.number(),
  })
    .searchIndex("search_body", {
      searchField: "body",
      filterFields: ["source", "tags"],
    })
    .index("by_source", ["source"])
    .index("by_sourceId", ["source", "sourceId"])
    .index("by_timestamp", ["timestamp"]),

  // ─────────────────────────────────────────────────────────────
  // Agent Sessions: 每个 agent 会话(用于去重 / 上下文)
  // ─────────────────────────────────────────────────────────────
  agentSessions: defineTable({
    sessionId: v.string(),
    agent: v.string(),
    channel: v.optional(v.string()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    activityCount: v.number(),
    lastActivityAt: v.optional(v.number()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_agent", ["agent"])
    .index("by_startedAt", ["startedAt"]),
});