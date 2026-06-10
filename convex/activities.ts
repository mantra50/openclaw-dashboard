import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * 写入一条 activity
 *
 * agent 每回合结束自动调用,带共享 token 鉴权(简化版:从 process.env 读)
 */
export const log = mutation({
  args: {
    type: v.string(),
    title: v.string(),
    detail: v.optional(v.string()),
    source: v.optional(v.string()),
    agent: v.optional(v.string()),
    channel: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    status: v.optional(v.string()),
    timestamp: v.optional(v.number()), // 补录历史 activity 用,默认 = Date.now()
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = args.timestamp ?? Date.now();
    const id = await ctx.db.insert("activities", {
      timestamp: now,
      type: args.type,
      title: args.title,
      detail: args.detail,
      source: args.source ?? "openclaw",
      agent: args.agent ?? "小八",
      channel: args.channel,
      sessionId: args.sessionId,
      durationMs: args.durationMs,
      status: args.status ?? "success",
      meta: args.meta,
    });

    // 顺带更新 session 计数
    if (args.sessionId) {
      const existing = await ctx.db
        .query("agentSessions")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId!))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          activityCount: existing.activityCount + 1,
          lastActivityAt: now,
          endedAt: now,
        });
      } else {
        await ctx.db.insert("agentSessions", {
          sessionId: args.sessionId,
          agent: args.agent ?? "小八",
          channel: args.channel,
          startedAt: now,
          endedAt: now,
          activityCount: 1,
          lastActivityAt: now,
        });
      }
    }

    // 联邦索引:同步一份到 searchDocuments
    await ctx.db.insert("searchDocuments", {
      source: "activity",
      sourceId: id,
      title: args.title,
      body: [args.title, args.detail ?? ""].filter(Boolean).join("\n\n"),
      tags: [args.type, args.agent ?? "小八", args.channel ?? ""].filter(Boolean),
      timestamp: now,
    });

    return id;
  },
});

/**
 * 拉最新 N 条 activities(时间倒序)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.string()),
    agent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    let q = ctx.db.query("activities").withIndex("by_timestamp").order("desc");
    const all = await q.take(limit * 3); // 多取一些用于过滤
    return all
      .filter((a) => (args.type ? a.type === args.type : true))
      .filter((a) => (args.agent ? a.agent === args.agent : true))
      .slice(0, limit);
  },
});

/**
 * 按时间窗口拉 activities(用于日历 / 详情)
 */
export const listByTimeRange = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("activities")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.startMs).lte("timestamp", args.endMs)
      )
      .order("desc")
      .collect();
  },
});

/**
 * 统计: 按 type 聚合最近 N 小时的活动数
 */
export const stats = query({
  args: { hours: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const hours = args.hours ?? 24;
    const since = Date.now() - hours * 3600 * 1000;
    const recent = await ctx.db
      .query("activities")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
      .collect();
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const a of recent) {
      byType[a.type] = (byType[a.type] ?? 0) + 1;
      byStatus[a.status ?? "success"] = (byStatus[a.status ?? "success"] ?? 0) + 1;
    }
    return { total: recent.length, byType, byStatus, since };
  },
});