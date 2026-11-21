import Link from "next/link";
import "../admin/erp.css";

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <div className="erp-app" lang="id"><header className="erp-public-header"><Link href="/">UFT</Link><nav aria-label="Navigasi acara"><Link href="/events">Acara & Pendaftaran</Link></nav></header><main className="erp-public-main">{children}</main></div>;
}
