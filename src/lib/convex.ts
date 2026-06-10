"use client";

import { ConvexReactClient } from "convex/react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!url) {
  // 开发期:不强抛,允许 SSR / 占位渲染
  // 真正用到 query/mutation 时,ConvexReactClient 会再报错
  console.warn("[mission-control] NEXT_PUBLIC_CONVEX_URL not set");
}

export const convex = new ConvexReactClient(url ?? "https://placeholder.convex.cloud");