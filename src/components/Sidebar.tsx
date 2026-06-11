"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Radio, CalendarDays, Search, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/activity", label: "Activity Feed", icon: Radio },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/search", label: "Global Search", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg-panel h-screen sticky top-0 flex flex-col">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-accent-blue" strokeWidth={2} />
          <span className="font-mono text-sm font-semibold tracking-wide">MISSION CONTROL</span>
        </div>
        <div className="text-xs text-text-muted mt-1 font-mono">v0.1 · 小八</div>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                active
                  ? "bg-bg-active text-text-primary border-l-2 border-accent-blue"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary border-l-2 border-transparent"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border text-xs text-text-muted font-mono">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span>实时同步</span>
        </div>
      </div>
    </aside>
  );
}