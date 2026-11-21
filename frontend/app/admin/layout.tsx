import type { Metadata } from "next";
import ErpProvider from "./erp-context";
import "./erp.css";
import "./erp-theme.css";

export const metadata: Metadata = { title: "Pengurus | UFT", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>
    <script dangerouslySetInnerHTML={{ __html: `try{var choice=localStorage.getItem("webuft-admin-theme");document.documentElement.dataset.erpTheme=choice==="light"||choice==="dark"?choice:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch{document.documentElement.dataset.erpTheme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}` }}/>
    <ErpProvider>{children}</ErpProvider>
  </>;
}
