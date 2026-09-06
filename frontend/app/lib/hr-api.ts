/**
 * HR API Client
 *
 * Semua request ke /api/hr/* menggunakan token dari localStorage.
 * Setiap fungsi mengembalikan { data, error, status }.
 */

const BASE = "/api/hr";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function hrFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const text = await res.text();
    let parsed: T | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const message =
        (parsed as Record<string, string>)?.message ||
        (parsed as Record<string, string>)?.detail ||
        `HTTP ${res.status}`;
      return { data: null, error: message, status: res.status };
    }
    return { data: parsed, error: null, status: res.status };
  } catch (e) {
    return { data: null, error: String(e), status: 0 };
  }
}

// ---- Types ----

export interface MedpartMasuk {
  id: number;
  nama: string;
  platform: string | null;
  kontak: string | null;
  jumlah_followers: number | null;
  link_bukti: string | null;
  syarat: string | null;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface MedpartMasukDetail extends MedpartMasuk {
  notes: { id: number; content: string; created_by: number; created_at: string }[];
  audit_logs: AuditLog[];
}

export interface MedpartSebar {
  id: number;
  nama: string;
  platform: string | null;
  kontak: string | null;
  jumlah_followers: number | null;
  link_akun: string | null;
  syarat_berbayar: boolean;
  harga: string | null;
  syarat_detail: string | null;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface JadwalPoster {
  id: number;
  medpart_id: number;
  proker_id: number | null;
  tanggal_deadline: string;
  catatan: string | null;
  link_bukti: string | null;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Sponsor {
  id: number;
  nama_perusahaan: string;
  pic_internal_id: number | null;
  cp_nama: string | null;
  cp_jabatan: string | null;
  cp_wa: string | null;
  cp_email: string | null;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface SponsorDetail extends Sponsor {
  proposals: SponsorProposal[];
  offers: SponsorOffer[];
  notes: SponsorNote[];
  audit_logs: AuditLog[];
}

export interface SponsorProposal {
  id: number;
  sponsor_id: number;
  tanggal_kirim: string;
  versi: string | null;
  link_file: string | null;
  created_by: number;
  created_at: string;
}

export interface SponsorOffer {
  id: number;
  sponsor_id: number;
  nilai: string | null;
  bentuk_kerjasama: string | null;
  syarat: string | null;
  status: string;
  created_by: number;
  created_at: string;
}

export interface SponsorNote {
  id: number;
  content: string;
  created_by: number;
  created_at: string;
}

export interface OfferSponsorship {
  id: number;
  nama_sponsor: string;
  nilai: string | null;
  bentuk_kerjasama: string | null;
  dokumen_link: string | null;
  syarat: string | null;
  status: string;
  note: string | null;
  sponsor_id: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface OfferKerjasama {
  id: number;
  nama_pengaju: string;
  kategori: string | null;
  kontak_person: string | null;
  deskripsi: string | null;
  bukti_link: string | null;
  nilai: string | null;
  status: string;
  note: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  aksi: string;
  user_nama: string;
  field_key: string | null;
  nilai_lama: string | null;
  nilai_baru: string | null;
  via_ai: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// ---- Medpart Masuk ----

export const medpartMasukApi = {
  list: (params?: { status?: string; search?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<MedpartMasuk>>(`/medpart-masuk/?${q}`);
  },
  get: (id: number) => hrFetch<MedpartMasukDetail>(`/medpart-masuk/${id}`),
  create: (data: Partial<MedpartMasuk>) =>
    hrFetch<MedpartMasuk>("/medpart-masuk/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<MedpartMasuk>) =>
    hrFetch<MedpartMasuk>(`/medpart-masuk/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/medpart-masuk/${id}`, { method: "DELETE" }),
  addNote: (id: number, content: string) =>
    hrFetch<{ id: number; content: string; created_by: number; created_at: string }>(
      `/medpart-masuk/${id}/note`,
      { method: "POST", body: JSON.stringify({ content }) }
    ),
};

// ---- Medpart Sebar ----

export const medpartSebarApi = {
  list: (params?: { status?: string; search?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<MedpartSebar>>(`/medpart-sebar/?${q}`);
  },
  get: (id: number) => hrFetch<MedpartSebar>(`/medpart-sebar/${id}`),
  create: (data: Partial<MedpartSebar>) =>
    hrFetch<MedpartSebar>("/medpart-sebar/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<MedpartSebar>) =>
    hrFetch<MedpartSebar>(`/medpart-sebar/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/medpart-sebar/${id}`, { method: "DELETE" }),
};

// ---- Jadwal Poster ----

export const jadwalPosterApi = {
  list: (params?: { medpart_id?: number; status?: string; overdue_only?: boolean; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.medpart_id) q.set("medpart_id", String(params.medpart_id));
    if (params?.status) q.set("status", params.status);
    if (params?.overdue_only) q.set("overdue_only", "true");
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<JadwalPoster>>(`/jadwal-poster/?${q}`);
  },
  create: (data: Partial<JadwalPoster>) =>
    hrFetch<JadwalPoster>("/jadwal-poster/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<JadwalPoster>) =>
    hrFetch<JadwalPoster>(`/jadwal-poster/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/jadwal-poster/${id}`, { method: "DELETE" }),
};

// ---- Sponsorship ----

export const sponsorshipApi = {
  list: (params?: { status?: string; search?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<Sponsor>>(`/sponsorship/?${q}`);
  },
  get: (id: number) => hrFetch<SponsorDetail>(`/sponsorship/${id}`),
  create: (data: Partial<Sponsor>) =>
    hrFetch<Sponsor>("/sponsorship/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Sponsor>) =>
    hrFetch<Sponsor>(`/sponsorship/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/sponsorship/${id}`, { method: "DELETE" }),
  addProposal: (id: number, data: Partial<SponsorProposal>) =>
    hrFetch<SponsorProposal>(`/sponsorship/${id}/proposal`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addOffer: (id: number, data: Partial<SponsorOffer>) =>
    hrFetch<SponsorOffer>(`/sponsorship/${id}/offer`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addNote: (id: number, content: string) =>
    hrFetch<SponsorNote>(`/sponsorship/${id}/note`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};

// ---- Offer Masuk ----

export const offerSponsorshipApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<OfferSponsorship>>(`/offer-sponsorship/?${q}`);
  },
  create: (data: Partial<OfferSponsorship>) =>
    hrFetch<OfferSponsorship>("/offer-sponsorship/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<OfferSponsorship>) =>
    hrFetch<OfferSponsorship>(`/offer-sponsorship/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/offer-sponsorship/${id}`, { method: "DELETE" }),
};

export const offerKerjasamaApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<OfferKerjasama>>(`/offer-kerjasama/?${q}`);
  },
  create: (data: Partial<OfferKerjasama>) =>
    hrFetch<OfferKerjasama>("/offer-kerjasama/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<OfferKerjasama>) =>
    hrFetch<OfferKerjasama>(`/offer-kerjasama/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/offer-kerjasama/${id}`, { method: "DELETE" }),
};

// ---- Template Chat ----

export interface TemplateChat {
  id: number;
  nama: string;
  kategori: string | null;
  konten: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ResolvedTemplate {
  original: string;
  resolved: string;
  wa_url: string;
  placeholders_found: string[];
  placeholders_missing: string[];
}

export const templateChatApi = {
  list: (params?: { kategori?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.kategori) q.set("kategori", params.kategori);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<TemplateChat>>(`/template-chat/?${q}`);
  },
  get: (id: number) => hrFetch<TemplateChat>(`/template-chat/${id}`),
  create: (data: { nama: string; kategori?: string; konten: string }) =>
    hrFetch<TemplateChat>("/template-chat/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<TemplateChat>) =>
    hrFetch<TemplateChat>(`/template-chat/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/template-chat/${id}`, { method: "DELETE" }),
  resolve: (id: number, context: Record<string, string>, phone?: string) => {
    const q = phone ? `?phone=${encodeURIComponent(phone)}` : "";
    return hrFetch<ResolvedTemplate>(`/template-chat/${id}/resolve${q}`, {
      method: "POST",
      body: JSON.stringify({ context }),
    });
  },
};

// ---- Proker ----

export interface Proker {
  id: number;
  nama: string;
  deskripsi: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ProkerMedpartAssign {
  medpart_id: number;
  status_kehadiran: string | null;
  created_at: string;
}

export interface ProkerSponsorAssign {
  sponsor_id: number;
  status: string | null;
  created_at: string;
}

export interface ProkerDetail extends Proker {
  medpart_assignments: ProkerMedpartAssign[];
  sponsor_assignments: ProkerSponsorAssign[];
}

export const prokerApi = {
  list: (params?: { skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<Proker>>(`/proker/?${q}`);
  },
  get: (id: number) => hrFetch<ProkerDetail>(`/proker/${id}`),
  create: (data: { nama: string; deskripsi?: string }) =>
    hrFetch<Proker>("/proker/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { nama?: string; deskripsi?: string }) =>
    hrFetch<Proker>(`/proker/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/proker/${id}`, { method: "DELETE" }),
  addMedpart: (id: number, medpart_id: number, status_kehadiran?: string) =>
    hrFetch<ProkerMedpartAssign>(`/proker/${id}/medpart`, {
      method: "POST",
      body: JSON.stringify({ medpart_id, status_kehadiran }),
    }),
  removeMedpart: (id: number, medpart_id: number) =>
    hrFetch<{ message: string }>(`/proker/${id}/medpart/${medpart_id}`, { method: "DELETE" }),
  addSponsor: (id: number, sponsor_id: number, status?: string) =>
    hrFetch<ProkerSponsorAssign>(`/proker/${id}/sponsor`, {
      method: "POST",
      body: JSON.stringify({ sponsor_id, status }),
    }),
  removeSponsor: (id: number, sponsor_id: number) =>
    hrFetch<{ message: string }>(`/proker/${id}/sponsor/${sponsor_id}`, { method: "DELETE" }),
};

// ---- Undangan ----

export interface Undangan {
  id: number;
  nama_acara: string;
  pengundang: string | null;
  tanggal: string | null;
  lokasi: string | null;
  deadline_konfirmasi: string | null;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface UndanganAssign {
  id: number;
  akun_id: number;
  status_kehadiran: string | null;
  created_at: string;
}

export interface UndanganDetail extends Undangan {
  assignments: UndanganAssign[];
}

export const undanganApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<Undangan>>(`/undangan/?${q}`);
  },
  get: (id: number) => hrFetch<UndanganDetail>(`/undangan/${id}`),
  create: (data: Partial<Undangan>) =>
    hrFetch<Undangan>("/undangan/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Undangan>) =>
    hrFetch<Undangan>(`/undangan/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/undangan/${id}`, { method: "DELETE" }),
  assign: (id: number, akun_id: number) =>
    hrFetch<UndanganAssign>(`/undangan/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ akun_id }),
    }),
  unassign: (id: number, akun_id: number) =>
    hrFetch<{ message: string }>(`/undangan/${id}/assign/${akun_id}`, { method: "DELETE" }),
  updateKehadiran: (id: number, akun_id: number, status_kehadiran: string) =>
    hrFetch<UndanganAssign>(`/undangan/${id}/assign/${akun_id}/kehadiran`, {
      method: "PATCH",
      body: JSON.stringify({ status_kehadiran }),
    }),
};

// ---- Reminder ----

export interface Reminder {
  id: number;
  jenis: string;
  referensi_id: number;
  judul: string | null;
  tanggal_deadline: string;
  status: string;
  snoozed_until: string | null;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderDashboard {
  overdue: Reminder[];
  mendekati: Reminder[];
  akan_datang: Reminder[];
}

export const reminderApi = {
  dashboard: () => hrFetch<ReminderDashboard>("/reminder/dashboard"),
  list: (params?: { jenis?: string; status?: string; assigned_to?: number; skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.jenis) q.set("jenis", params.jenis);
    if (params?.status) q.set("status", params.status);
    if (params?.assigned_to != null) q.set("assigned_to", String(params.assigned_to));
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<Reminder>>(`/reminder/?${q}`);
  },
  create: (data: {
    jenis: string;
    referensi_id: number;
    judul?: string;
    tanggal_deadline: string;
    assigned_to?: number;
  }) => hrFetch<Reminder>("/reminder/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Reminder>) =>
    hrFetch<Reminder>(`/reminder/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  markDone: (id: number) =>
    hrFetch<Reminder>(`/reminder/${id}/selesai`, { method: "POST" }),
  delete: (id: number) =>
    hrFetch<{ message: string }>(`/reminder/${id}`, { method: "DELETE" }),
  syncOverdue: () =>
    hrFetch<{ updated: number }>("/reminder/sync-overdue", { method: "POST" }),
};

// ---- Aspirasi ----

export interface AspirasiSettings {
  id: number;
  link_form: string | null;
  link_grup_wa: string | null;
  template_pesan: string | null;
  updated_by: number | null;
  updated_at: string;
}

export interface AspirasiRiwayat {
  id: number;
  bulan: number;
  tahun: number;
  dikirim_oleh: number | null;
  dikirim_pada: string | null;
  link_rekap: string | null;
  status: string;
  created_at: string;
}

export const aspirasiApi = {
  getSettings: () => hrFetch<AspirasiSettings>("/aspirasi/settings"),
  updateSettings: (data: { link_form?: string; link_grup_wa?: string; template_pesan?: string }) =>
    hrFetch<AspirasiSettings>("/aspirasi/settings", { method: "PATCH", body: JSON.stringify(data) }),
  getRiwayat: (tahun?: number) => {
    const q = tahun ? `?tahun=${tahun}` : "";
    return hrFetch<AspirasiRiwayat[]>(`/aspirasi/riwayat${q}`);
  },
  getBulanIni: () => hrFetch<AspirasiRiwayat>("/aspirasi/riwayat/bulan-ini"),
  markSent: (bulan: number, tahun: number, link_rekap?: string) =>
    hrFetch<AspirasiRiwayat>(`/aspirasi/riwayat/${bulan}/${tahun}/kirim`, {
      method: "POST",
      body: JSON.stringify({ link_rekap }),
    }),
};

// ---- Audit Log Global ----

export interface AuditLogEntry {
  id: number;
  modul: string;
  record_id: number;
  aksi: string;
  user_id: number;
  user_nama: string;
  field_key: string | null;
  nilai_lama: string | null;
  nilai_baru: string | null;
  via_ai: boolean;
  created_at: string;
}

export const auditLogApi = {
  list: (params?: {
    modul?: string;
    user_id?: number;
    date_from?: string;
    date_to?: string;
    skip?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.modul) q.set("modul", params.modul);
    if (params?.user_id != null) q.set("user_id", String(params.user_id));
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    if (params?.skip != null) q.set("skip", String(params.skip));
    if (params?.limit != null) q.set("limit", String(params.limit));
    return hrFetch<PaginatedResponse<AuditLogEntry>>(`/audit-log/?${q}`);
  },
  getModuls: () => hrFetch<{ moduls: string[] }>("/audit-log/moduls"),
};

