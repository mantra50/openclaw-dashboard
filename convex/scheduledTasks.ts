import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * 新建一个 scheduled task
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueAt: v.number(),
    durationMinutes: v.optional(v.number()),
    priority: v.optional(v.string()),
    agent: v.optional(v.string()),
    category: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("scheduledTasks", {
      title: args.title,
      description: args.description,
      dueAt: args.dueAt,
      durationMinutes: args.durationMinutes,
      status: "pending",
      priority: args.priority ?? "medium",
      agent: args.agent,
      category: args.category,
      createdAt: now,
      createdBy: args.createdBy,
    });

    await ctx.db.insert("searchDocuments", {
      source: "task",
      sourceId: id,
      title: args.title,
      body: [args.title, args.description ?? ""].filter(Boolean).join("\n\n"),
      tags: ["task", args.priority ?? "medium", args.agent ?? "", args.category ?? ""].filter(Boolean),
      timestamp: now,
    });

    return id;
  },
});

/**
 * 更新 task 状态 / 字段
 */
export const update = mutation({
  args: {
    id: v.id("scheduledTasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    const completedAt = patch.status === "done" ? Date.now() : undefined;
    await ctx.db.patch(id, { ...patch, ...(completedAt ? { completedAt } : {}) });
    return id;
  },
});

/**
 * 删除
 */
export const remove = mutation({
  args: { id: v.id("scheduledTasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * 拉某周的任务(周视图)
 * @param weekStartMs 周一 00:00:00 的 unix ms
 */
export const listForWeek = query({
  args: { weekStartMs: v.number() },
  handler: async (ctx, args) => {
    const weekEndMs = args.weekStartMs + 7 * 24 * 3600 * 1000;
    return ctx.db
      .query("scheduledTasks")
      .withIndex("by_dueAt", (q) =>
        q.gte("dueAt", args.weekStartMs).lt("dueAt", weekEndMs)
      )
      .collect();
  },
});

/**
 * 拉未来 N 天的任务
 */
export const listUpcoming = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const now = Date.now();
    const horizon = now + days * 24 * 3600 * 1000;
    return ctx.db
      .query("scheduledTasks")
      .withIndex("by_dueAt", (q) => q.gte("dueAt", now).lt("dueAt", horizon))
      .order("asc")
      .collect();
  },
});

/**
 * 拉所有 pending 任务(用于 dashboard 总览)
 */
export const listPending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("scheduledTasks")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(args.limit ?? 50);
  },
});