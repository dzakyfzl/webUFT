/**
 * HR Login memiliki layout sendiri (tanpa sidebar) karena user belum login.
 * Ini override layout parent /hr/layout.tsx hanya untuk route /hr/login.
 */
export default function HRLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
