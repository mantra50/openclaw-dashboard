# Mission Control

大王的实时状态盘。NextJS 14 + Convex + Tailwind。

**三个核心 page:**

| Page | 路径 | 功能 |
|---|---|---|
| Activity Feed | `/activity` | agent 每回合自动上报的活动流,实时滚动 |
| Calendar | `/calendar` | 周视图,显示未来 7 天的 scheduled tasks,可新建/编辑 |
| Global Search | `/search` | 联邦搜索(memory / activities / tasks),关键词高亮 |
| 总览 | `/` | 三块拼起来:24h 统计 + 最近活动 + 未来 7 天 |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /root/mission-control
npm install
```

### 2. 启动 Convex(开发模式)

第一次会问你要不要登录 / 创建 project,跟着提示走:

```bash
npx convex dev
```

启动后会输出:
- 你的 deployment URL,例如 `https://xxx.convex.cloud`
- 自动写进 `.env.local` 的 `CONVEX_DEPLOYMENT` 和 `NEXT_PUBLIC_CONVEX_URL`

### 3. 启动 NextJS

另开一个终端:

```bash
npm run dev
```

打开 http://localhost:3000

### 4. (可选)灌演示数据

```bash
npx tsx scripts/seed.ts
```

会创建:
- 6 条 demo activities(包含今天的飞书对话记录)
- 4 个 demo scheduled tasks
- 2 条 demo memory 文档

---

## 🤖 全自动 Activity 上报

`scripts/log-activity.mjs` 是一个 CLI 工具,任何 agent 都能调:

```bash
# 基本用法
node scripts/log-activity.mjs \
  --type task_complete \
  --title "Mission Control 脚手架就绪" \
  --detail "NextJS + Convex + Tailwind"

# 也支持 stdin JSON
echo '{"type":"tool_call","title":"...","detail":"..."}' | \
  node scripts/log-activity.mjs --stdin
```

**预置 bash wrapper:** `bin/log-activity`(更短)

```bash
./bin/log-activity --type error --title "Convex 部署失败"
```

### OpenClaw 集成(小八自动上报)

`log-activity` 的设计目标就是给小八在 OpenClaw 里**每个回话结束自动调一次**。

**当前做法:** 小八在每次回话结束前,主动执行:
```bash
log-activity --type conversation \
  --title "本回合做的事(一句话)" \
  --detail "详细动作清单" \
  --channel feishu
```

**未来可升级:** 把"log-activity 自动调"做成 OpenClaw 的 system prompt 一部分,
或写一个 OpenClaw plugin hook(在每次工具调用后自动写一条 activity)。

---

## 📁 项目结构

```
mission-control/
├── convex/
│   ├── schema.ts              # 4 张表
│   ├── activities.ts          # activities mutations + queries
│   ├── scheduledTasks.ts      # tasks mutations + queries
│   └── search.ts              # 联邦搜索索引 + 查询
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # / - 总览
│   │   ├── activity/page.tsx  # /activity
│   │   ├── calendar/page.tsx  # /calendar
│   │   └── search/page.tsx    # /search
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── CalendarWeek.tsx
│   │   ├── TaskModal.tsx
│   │   ├── SearchBar.tsx
│   │   └── ResultCard.tsx
│   └── lib/
│       ├── convex.ts          # ConvexReactClient 单例
│       └── utils.ts           # cn / time helpers
├── scripts/
│   ├── log-activity.mjs       # agent 上报 CLI
│   └── seed.ts                # 灌演示数据
├── bin/
│   └── log-activity           # bash wrapper
├── package.json
├── tailwind.config.ts
└── README.md
```

---

## 🗃️ Convex Schema(4 张表)

### `activities`
Agent 每回合上报的动作记录。自动同步到 `searchDocuments`。

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | number | unix ms |
| `type` | string | tool_call / task_complete / doc_created / file_edit / command_run / error / note / conversation |
| `title` | string | 一句话总结 |
| `detail` | string? | 详情 |
| `source` | string | openclaw / codex / manual |
| `agent` | string | "小八" |
| `channel` | string? | feishu / codex / web |
| `sessionId` | string? | OpenClaw session id |
| `durationMs` | number? | 耗时 |
| `status` | string? | success / warning / error / info |
| `meta` | any? | metadata |

### `scheduledTasks`
日历任务。`create` 时自动同步到 `searchDocuments`。

| 字段 | 类型 |
|---|---|
| `title` | string |
| `description` | string? |
| `dueAt` | number |
| `durationMinutes` | number? |
| `status` | pending / in_progress / done / cancelled |
| `priority` | low / medium / high |
| `agent` | string? |
| `category` | string? |
| `createdAt` / `completedAt` | number |

### `searchDocuments`
联邦搜索索引。`activities:log` 和 `scheduledTasks:create` 自动写入。

`body` 字段建了 Convex 全文搜索索引(`searchIndex`),
按 `source` / `tags` 过滤。

### `agentSessions`
会话级聚合(总活动数 / 起始时间等)。

---

## 🔌 把 memory 灌进 search index

`scripts/` 下加一个简单的脚本就能把 `~/.openclaw/workspace-work/memory/*.md` 全部索引:

```js
// scripts/index-memory.mjs (示例,后面可加)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "/root/.openclaw/workspace-work/memory";
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".md")) continue;
  const body = readFileSync(join(dir, f), "utf8");
  await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "search:index",
      args: { source: "memory", sourceId: f, title: f, body, tags: ["memory"] },
    }),
  });
}
```

未来想做"全局搜索 飞书 docs"也类似,只是 source 改成 `feishu_doc`,
sourceId 用 doc token,title/body 拉飞书 API 填充。

---

## 🛠️ 常见操作

```bash
# 开发
npm run dev                # NextJS dev server
npm run convex:dev         # Convex dev (watch schema)

# 生产
npm run build
npm run convex:deploy      # 部署 Convex functions 到 production
npm run start              # NextJS production server

# 数据
npm run seed               # 灌演示数据

# 上报 activity (agent 用)
./bin/log-activity --type <t> --title <t> [--detail <d>]
```

---

## 📋 TODO(后续可加)

- [ ] memory 文件自动索引脚本
- [ ] 飞书 docs 索引 / 拉取脚本
- [ ] OpenClaw plugin hook(每工具调用后自动 log)
- [ ] Activity Feed 详情抽屉(modal 展示 meta + raw payload)
- [ ] Calendar 拖拽改时间
- [ ] Search 高亮改进(fuzzy match + 拼音)
- [ ] 移动端适配
- [ ] 多 agent 隔离(目前 agent 字段只是字符串,没做 ACL)
<!-- trigger redeploy 1781084118 -->

