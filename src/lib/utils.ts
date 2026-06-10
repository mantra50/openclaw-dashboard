import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化相对时间("刚刚" / "3 分钟前" / "2 小时前")
 */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  if (diff < 5_000) return "刚刚";
  if (diff < 60_000) return `${Math.floor(diff / 1000)} 秒前`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

/**
 * 格式化绝对时间
 */
export function formatTime(ts: number, withSeconds = false): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return withSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
}

/**
 * 格式化日期(短)
 */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 取某周的周一 00:00:00 unix ms
 */
export function weekStart(reference: Date = new Date()): number {
  const d = new Date(reference);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // 让周一成为第一天
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * 给定周一,返回 7 天的 Date[]
 */
export function weekDays(mondayMs: number): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayMs);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export const DAY_NAMES_CN = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];