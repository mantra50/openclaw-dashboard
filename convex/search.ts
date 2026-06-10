import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * 索引一条文档到 searchDocuments
 *
 * 用于离线索引 memory 文件 / 飞书 docs / 历史活动
 */
export const index = mutation({
  args: {
    source: v.string(),
    sourceId: v.string(),
    title: v.string(),
    body: v.string(),
    tags: v.optional(v.array(v.string())),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ts = args.timestamp ?? Date.now();

    // 去重:同 source+sourceId 先删
    const existing = await ctx.db
      .query("searchDocuments")
      .withIndex("by_sourceId", (q) =>
        q.eq("source", args.source).eq("sourceId", args.sourceId)
      )
      .collect();
    for (const e of existing) {
      await ctx.db.delete(e._id);
    }

    return ctx.db.insert("searchDocuments", {
      source: args.source,
      sourceId: args.sourceId,
      title: args.title,
      body: args.body,
      tags: args.tags,
      timestamp: ts,
    });
  },
});

/**
 * 批量索引
 */
export const indexBatch = mutation({
  args: {
    items: v.array(
      v.object({
        source: v.string(),
        sourceId: v.string(),
        title: v.string(),
        body: v.string(),
        tags: v.optional(v.array(v.string())),
        timestamp: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids: string[] = [];
    for (const item of args.items) {
      const id = await ctx.db.insert("searchDocuments", {
        source: item.source,
        sourceId: item.sourceId,
        title: item.title,
        body: item.body,
        tags: item.tags,
        timestamp: item.timestamp ?? Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

/**
 * 联邦全文搜索
 *
 * 用 Convex 内置的 searchIndex,按 query 搜 body/title,
 * 可选按 source 过滤
 */
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      // 空查询:返回最近 50 条
      return ctx.db
        .query("searchDocuments")
        .withIndex("by_timestamp")
        .order("desc")
        .take(args.limit ?? 50);
    }

    let q = ctx.db.query("searchDocuments").withSearchIndex("search_body", (q) =>
      q.search("body", args.query)
    );
    if (args.source) {
      q = q.filter((qq) => qq.eq(qq.field("source"), args.source!));
    }
    const results = await q.take(args.limit ?? 50);
    return results;
  },
});

/**
 * 按 source 列出所有(用于 Search UI 的侧栏 / 浏览模式)
 */
export const listBySource = query({
  args: {
    source: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("searchDocuments")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .order("desc")
      .take(args.limit ?? 50);
  },
});