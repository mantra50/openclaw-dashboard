#!/usr/bin/env node
/**
 * log-activity: 把当前动作上报到 Convex Mission Control
 *
 * 用法:
 *   node scripts/log-activity.mjs --type tool_call --title "..." --detail "..."
 *   node scripts/log-activity.mjs --type task_complete --title "建好 Mission Control 脚手架"
 *   cat stdin | node scripts/log-activity.mjs --stdin
 *
 * 环境变量:
 *   CONVEX_URL  - Convex deployment URL,例如 https://xxx.convex.cloud
 *
 * 自动从 git / cwd / 环境推断 source/agent/channel/sessionId。
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { homedir, hostname, userInfo } from "node:os";

// ── 参数解析 ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stdin") {
      args.stdin = true;
    } else if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1];
      args[key] = val;
      i++;
    } else {
      positional.push(a);
    }
  }
  return args;
}

const argv = parseArgs(process.argv);

// ── stdin 模式:JSON from stdin ─────────────────────────────────────────
let payload;
if (argv.stdin) {
  try {
    payload = JSON.parse(readFileSync(0, "utf8"));
  } catch (e) {
    console.error("[log-activity] failed to parse stdin JSON:", e.message);
    process.exit(2);
  }
} else {
  if (!argv.type || !argv.title) {
    console.error(
      "[log-activity] usage: --type <type> --title <title> [--detail <d>] [--channel <c>] [--session-id <id>]"
    );
    process.exit(1);
  }
  payload = {
    type: argv.type,
    title: argv.title,
    detail: argv.detail,
    channel: argv.channel,
    sessionId: argv["session-id"],
    durationMs: argv["duration-ms"] ? Number(argv["duration-ms"]) : undefined,
    status: argv.status,
  };
}

// ── 自动填充: agent / source ───────────────────────────────────────────
const AGENT = process.env.AGENT_NAME || "小八";
const CHANNEL = payload.channel || process.env.AGENT_CHANNEL || "openclaw";
const SESSION_ID =
  payload.sessionId || process.env.AGENT_SESSION_ID || `sess_${Date.now()}`;
const SOURCE = process.env.AGENT_SOURCE || "openclaw";

payload.agent = payload.agent || AGENT;
payload.channel = payload.channel || CHANNEL;
payload.sessionId = SESSION_ID;
payload.source = SOURCE;

// ── Convex URL ─────────────────────────────────────────────────────────
const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  loadConvexUrlFromEnvFile();

if (!CONVEX_URL) {
  console.error(
    "[log-activity] CONVEX_URL not set. Run `npx convex dev` and set NEXT_PUBLIC_CONVEX_URL in .env.local"
  );
  process.exit(3);
}

function loadConvexUrlFromEnvFile() {
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "../.env.local"),
    resolve(homedir(), "mission-control/.env.local"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const txt = readFileSync(p, "utf8");
    const m = txt.match(/^NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}

// ── POST 到 Convex ─────────────────────────────────────────────────────
const url = `${CONVEX_URL.replace(/\/$/, "")}/api/mutation`;

(async () => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "activities:log",
        args: payload,
      }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error(`[log-activity] HTTP ${res.status}:`, data);
      process.exit(4);
    }

    if (data.status === "error" || data.error) {
      console.error("[log-activity] Convex error:", data.errorMessage || data.error);
      process.exit(5);
    }

    // 成功:打 activityId
    const id = data.value ?? data.id ?? "(no id)";
    console.log(`[log-activity] ok · ${payload.type} · id=${id}`);
    process.exit(0);
  } catch (e) {
    console.error("[log-activity] network error:", e.message);
    process.exit(6);
  }
})();