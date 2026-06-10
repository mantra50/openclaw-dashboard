import type { Metadata } from "next";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "小八 · Activity / Calendar / Search",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ConvexClientProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}