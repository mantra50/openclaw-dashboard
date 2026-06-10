#!/usr/bin/env tsx
/**
 * seed.ts — 往 Convex 灌初始数据(开发演示用)
 *
 * 用法:
 *   npx tsx scripts/seed.ts
 *
 * 创建:
 *  - 5-10 条 demo activities
 *  - 3-5 个 demo scheduled tasks
 *  - 2-3 条 demo memory 文档
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Set NEXT_PUBLIC_CONVEX_URL in .env.local first");
  process.exit(1);
}

const baseUrl = CONVEX_URL.replace(/\/$/, "");

async function callMutation(path: string, args: any) {
  const res = await fetch(`${baseUrl}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args }),
  });
  const data = await res.json();
  if (data.status === "error") {
    throw new Error(data.errorMessage || JSON.stringify(data));
  }
  return data.value;
}

async function main() {
  console.log(`Seeding ${baseUrl}…`);

  const now = Date.now();

  // Activities
  const demoActivities = [
    {
      type: "conversation",
      title: "大王问起 Codex / Convex / 三个 dashboard 功能",
      detail: "对齐技术栈决策,确认 Activity Feed 走全自动",
      timestamp: now - 3_600_000,
      channel: "feishu",
    },
    {
      type: "tool_call",
      title: "POST 124.220.24.243:19000/leave-agent",
      detail: "探查完海辛/Star 办公室后干净退出",
      timestamp: now - 7_200_000,
      channel: "exec",
    },
    {
      type: "doc_created",
      title: "memory/2026-06-10.md 写入",
      detail: "记录海辛办公室探查 + 教训",
      timestamp: now - 7_100_000,
      channel: "write",
    },
    {
      type: "command_run",
      title: "curl GET /status /agents",
      detail: "查海辛办公室的 API 端点",
      timestamp: now - 7_300_000,
      channel: "exec",
    },
    {
      type: "task_complete",
      title: "Mission Control 项目脚手架就绪",
      detail: "NextJS 14 + Convex + Tailwind",
      timestamp: now - 600_000,
      channel: "codex",
    },
    {
      type: "file_edit",
      title: "convex/schema.ts",
      detail: "4 张表:activities / scheduledTasks / searchDocuments / agentSessions",
      timestamp: now - 300_000,
      channel: "write",
    },
  ];

  for (const a of demoActivities) {
    await callMutation("activities:log", {
      type: a.type,
      title: a.title,
      detail: a.detail,
      channel: a.channel,
      timestamp: a.timestamp,
    });
    console.log("  · activity:", a.title);
  }

  // Tasks
  const day = 86_400_000;
  const demoTasks = [
    {
      title: "Mission Control 三个 page 写完",
      description: "Activity Feed / Calendar / Global Search",
      dueAt: now + day,
      priority: "high",
      category: "work",
    },
    {
      title: "跟大王一起跑通 convex dev",
      dueAt: now + 2 * day,
      priority: "high",
      category: "work",
    },
    {
      title: "晚饭提醒",
      description: "不要太晚",
      dueAt: now + 10 * 3600 * 1000,
      priority: "medium",
      category: "personal",
    },
    {
      title: "周报整理",
      dueAt: now + 4 * day,
      priority: "low",
      category: "work",
    },
  ];

  for (const t of demoTasks) {
    await callMutation("scheduledTasks:create", t);
    console.log("  · task:", t.title);
  }

  // Search documents (memory 风格)
  const memoryDocs = [
    {
      source: "memory",
      sourceId: "MEMORY.md",
      title: "小八 · MEMORY",
      body:
        "大王 (ou_5410015fe4d9d29d1a362a6e648ab221) — 飞书 work 账号,直接对话。风格:直接、幽默。所有文档相关输出默认走飞书文档,不落本地。",
      tags: ["user", "preferences"],
    },
    {
      source: "memory",
      sourceId: "memory/2026-06-10.md",
      title: "2026-06-10 daily",
      body:
        "加入海辛/Star 像素办公室做一次性探查,发现访客无法上报状态(接口设计局限),干净退出。教训:加入第三方服务先看协议对'我这个角色'开放了什么。",
      tags: ["daily", "lesson"],
    },
  ];

  for (const m of memoryDocs) {
    await callMutation("search:index", m);
    console.log("  · search doc:", m.title);
  }

  console.log("\n✅ Seed done. Open http://localhost:3000 to see it.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});