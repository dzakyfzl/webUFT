"use client";

import { usePathname } from "next/navigation";
import ChatWidget from "./ChatWidget";

export default function PublicChatBoundary() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <ChatWidget />;
}
