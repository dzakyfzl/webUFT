/**
 * HR Auth utility
 * 
 * Decode JWT dari localStorage dan return user payload + access list.
 */

import { jwtDecode, JwtPayload } from "jwt-decode";

interface HRJwtPayload extends JwtPayload {
  user_id?: number;
  username?: string;
  nama?: string;
  access?: string[];
  role?: string;
}

export interface HRUser {
  user_id: number;
  username: string;
  nama: string;
  access: string[];
  role: string;
}

export function getHRUser(): HRUser | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    const decoded = jwtDecode<HRJwtPayload>(token);
    // Check expiry
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return {
      user_id: decoded.user_id ?? 0,
      username: decoded.username ?? "",
      nama: decoded.nama ?? decoded.username ?? "",
      access: decoded.access ?? [],
      role: decoded.role ?? "",
    };
  } catch {
    return null;
  }
}

export function hasAccess(user: HRUser | null, bidang: string): boolean {
  if (!user) return false;
  return user.access.includes(bidang);
}

/**
 * HR bidang yang relevan untuk menu sidebar.
 * Urutan menentukan urutan menu.
 */
export const HR_MENU = [
  {
    label: "Dashboard",
    href: "/hr",
    icon: "⊞",
    bidang: null, // selalu tampil
  },
  {
    label: "Medpart Masuk",
    href: "/hr/medpart-masuk",
    icon: "📥",
    bidang: "Kelola Medpart Masuk",
  },
  {
    label: "Medpart Sebar",
    href: "/hr/medpart-sebar",
    icon: "📤",
    bidang: "Kelola Medpart Sebar",
  },
  {
    label: "Jadwal Poster",
    href: "/hr/jadwal-poster",
    icon: "📅",
    bidang: "Kelola Medpart Masuk",
  },
  {
    label: "Sponsorship",
    href: "/hr/sponsorship",
    icon: "🤝",
    bidang: "Kelola Sponsorship",
  },
  {
    label: "Offer Masuk",
    href: "/hr/offer-masuk",
    icon: "📨",
    bidang: "Kelola Offer Masuk",
  },
  {
    label: "Template Chat",
    href: "/hr/template-chat",
    icon: "💬",
    bidang: "Kelola Template Chat",
  },
  {
    label: "Proker",
    href: "/hr/proker",
    icon: "📋",
    bidang: "Kelola Proker",
  },
  {
    label: "Undangan",
    href: "/hr/undangan",
    icon: "✉️",
    bidang: "Kelola Undangan",
  },
  {
    label: "Reminder",
    href: "/hr/reminder",
    icon: "🔔",
    bidang: "Kelola Reminder",
  },
  {
    label: "Aspirasi",
    href: "/hr/aspirasi",
    icon: "💡",
    bidang: "Kelola Aspirasi",
  },
  {
    label: "Audit Log",
    href: "/hr/audit-log",
    icon: "📜",
    bidang: "Kelola Audit Log",
  },
] as const;
