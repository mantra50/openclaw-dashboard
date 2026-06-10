#!/usr/bin/env node
/**
 * index-memory: 把 ~/.openclaw/workspace-work/memory/ 全部 markdown 索引到 Convex searchDocuments
 *
 * 用法:
 *   node scripts/index-memory.mjs
 *   node scripts/index-memory.mjs --path /some/other/notes
 *
 * 不传 --path 默认索引:
 *   ~/.openclaw/workspace-work/MEMORY.md
 *   ~/.openclaw/workspace-work/memory/*.md
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

const argv = process.argv.slice(2);
let basePath = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--path") basePath = argv[++i];
}

if (!basePath) {
  basePath = resolve(homedir(), ".openclaw/workspace-work");
}

const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  loadFromEnvFile();
if (!CONVEX_URL) {
  console.error(
    "[index-memory] CONVEX_URL not set. Run convex dev and set NEXT_PUBLIC_CONVEX_URL"
  );
  process.exit(1);
}

function loadFromEnvFile() {
  const candidates = [".env.local", "../.env.local", join(homedir(), "mission-control/.env.local")];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const txt = readFileSync(p, "utf8");
    const m = txt.match(/^NEXT_PUBLIC_CONVEX_URL\s*=\s*(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}

function listMarkdown(root) {
  const out = [];
  function walk(dir) {
    let stat;
    try {
      stat = statSync(dir);
    } catch {
      return;
    }
    if (!stat.isDirectory()) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      let s;
      try {
        s = statSync(p);
      } catch {
        continue;
      }
      if (s.isDirectory()) walk(p);
      else if (name.endsWith(".md")) out.push(p);
    }
  }
  walk(root);
  return out;
}

async function indexOne(filePath) {
  const content = readFileSync(filePath, "utf8");
  const rel = filePath.replace(basePath + "/", "");
  const title =
    content.match(/^#\s+(.+)$/m)?.[1]?.trim() || rel.replace(/\.md$/, "");

  const tags = ["memory"];
  if (rel === "MEMORY.md") tags.push("core");
  else tags.push("daily");

  const body = content.slice(0, 8000); // Convex 字段有大小限制,截断
  const args = {
    source: "memory",
    sourceId: rel,
    title,
    body,
    tags,
    timestamp: statSync(filePath).mtimeMs,
  };

  const res = await fetch(`${CONVEX_URL.replace(/\/$/, "")}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "search:index", args }),
  });

  const data = await res.json();
  if (data.status === "error" || !res.ok) {
    throw new Error(data.errorMessage || JSON.stringify(data));
  }
  return data.value;
}

(async () => {
  console.log(`[index-memory] base: ${basePath}`);
  console.log(`[index-memory] convex: ${CONVEX_URL}`);

  const files = listMarkdown(basePath).filter((f) => f.includes("/memory/") || f.endsWith("/MEMORY.md"));
  console.log(`[index-memory] found ${files.length} markdown files`);

  let ok = 0,
    fail = 0;
  for (const f of files) {
    try {
      await indexOne(f);
      console.log(`  · ${f.replace(basePath + "/", "")}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${f}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n[index-memory] done: ${ok} ok, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();