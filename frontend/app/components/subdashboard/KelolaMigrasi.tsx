"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Tipe Data ────────────────────────────────────────────────────────────────

interface MigrationRecord {
  migrateID: number;
  exported_at: string;
  exporter_username: string;
  imported_at: string | null;
  importer_username: string | null;
}

interface FormattedDateTime {
  date: string;
  time: string;
  relative: string;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  try {
    const res = await fetch("/api/akun/access-token", {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.access_token) {
      localStorage.setItem("access_token", data.access_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  router: ReturnType<typeof useRouter>
): Promise<Response | null> {
  let token = localStorage.getItem("access_token");
  if (!token) {
    router.push("/admin/login");
    return null;
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      router.push("/admin/login");
      return null;
    }
    headers.set("Authorization", `Bearer ${newToken}`);
    res = await fetch(url, { ...options, headers });
  }

  return res;
}

function parseAndFormatDate(dateStr: string | null | undefined): FormattedDateTime | null {
  if (!dateStr) return null;

  // Handle standard ISO strings or SQL datetime formats
  const normalizedStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  const d = new Date(normalizedStr);
  if (isNaN(d.getTime())) return null;

  const date = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);

  const time =
    new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d) + " WIB";

  // Hitung perkiraan relatif waktu
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  let relative = "";
  if (diffSec < 60) relative = "baru saja";
  else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)} mnt lalu`;
  else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)} jam lalu`;
  else relative = `${Math.floor(diffSec / 86400)} hari lalu`;

  return { date, time, relative };
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// ─── Komponen Utama ────────────────────────────────────────────────────────────

export default function KelolaMigrasi() {
  const router = useRouter();

  // State Data Riwayat
  const [historyList, setHistoryList] = useState<MigrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State File Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Notifikasi / Toast
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    title?: string;
    msg: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", msg: string, title?: string) => {
    setToast({ type, msg, title });
    setTimeout(() => setToast(null), 5000);
  };

  // ── 1. Fetch History Migrasi ───────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authenticatedFetch("/api/migrate/", { method: "GET" }, router);
      if (!res) return;

      if (res.status === 401 || res.status === 403) {
        showToast(
          "error",
          "Akses ditolak: Anda tidak memiliki wewenang atau sesi Anda telah berakhir.",
          "Unauthorized (401/403)"
        );
        return;
      }

      if (!res.ok) {
        let errMessage = "Gagal mengambil data riwayat migrasi dari database.";
        try {
          const errData = await res.json();
          if (errData.message) errMessage = errData.message;
        } catch {
          // ignore parse error
        }
        showToast("error", errMessage, `Server Error (${res.status})`);
        return;
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setHistoryList(data);
      } else if (data && typeof data === "object") {
        setHistoryList(Array.isArray(data.payload) ? data.payload : []);
      }
    } catch (err: any) {
      showToast(
        "error",
        err.message || "Terjadi gangguan saat menghubungkan ke server.",
        "Kesalahan Jaringan"
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── 2. Ekspor Data (.zip) ─────────────────────────────────────────────────
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const res = await authenticatedFetch("/api/migrate/export", { method: "GET" }, router);
      if (!res) return;

      // Tangani Error Status Codes
      if (!res.ok) {
        let errorMsg = "Terjadi kesalahan saat memproses ekspor data.";
        let errTitle = `Error (${res.status})`;

        if (res.status === 401 || res.status === 403) {
          errTitle = "Akses Ditolak (401/403)";
          errorMsg = "Anda tidak memiliki izin untuk mengekspor data migrasi.";
        } else if (res.status === 500) {
          errTitle = "Database / Server Error (500)";
          try {
            const errData = await res.json();
            errorMsg = errData.message || "Gagal membuat arsip migrasi di server.";
          } catch {
            errorMsg = "Terjadi kesalahan internal server atau database saat mengekspor.";
          }
        } else {
          try {
            const errData = await res.json();
            if (errData.message) errorMsg = errData.message;
          } catch {
            // ignore
          }
        }

        showToast("error", errorMsg, errTitle);
        return;
      }

      // Ambil Nama File dari header Content-Disposition jika ada
      const disposition = res.headers.get("Content-Disposition");
      let filename = `migrate_export_${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}.zip`;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      // Download file blob
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.URL.revokeObjectURL(blobUrl);

      showToast(
        "success",
        `File arsip "${filename}" berhasil diunduh dan riwayat telah disimpan.`,
        "Ekspor Berhasil"
      );

      // Refresh tabel riwayat
      fetchHistory();
    } catch (err: any) {
      showToast(
        "error",
        err.message || "Terjadi kesalahan tidak terduga saat mengekspor data.",
        "Ekspor Gagal"
      );
    } finally {
      setIsExporting(false);
    }
  };

  // ── 3. Impor Data (.zip) ──────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showToast("error", "Silakan pilih atau seret file .zip terlebih dahulu.", "File Belum Dipilih");
      return;
    }

    // Validasi format file sisi klien (.zip)
    if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
      showToast(
        "error",
        "File yang dipilih bukan berformat .zip. Mohon unggah arsip zip yang valid.",
        "Must be a zip file (400)"
      );
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await authenticatedFetch(
        "/api/migrate/import",
        {
          method: "POST",
          body: formData,
        },
        router
      );

      if (!res) return;

      let responseData: any = {};
      try {
        responseData = await res.json();
      } catch {
        // response may not be json
      }

      if (!res.ok) {
        const msg = responseData.message || "";

        if (res.status === 401 || res.status === 403) {
          showToast(
            "error",
            "Anda tidak memiliki izin untuk mengimpor data ini.",
            "Unauthorized (401/403)"
          );
        } else if (res.status === 400) {
          if (msg === "Must be a zip file" || !selectedFile.name.endsWith(".zip")) {
            showToast(
              "error",
              "File yang diunggah harus berupa file arsip .zip.",
              "Must be a zip file (400)"
            );
          } else if (
            msg === "Invalid timestamp in filename" ||
            msg.toLowerCase().includes("timestamp")
          ) {
            showToast(
              "error",
              "Nama file tidak memiliki format timestamp yang valid (contoh format nama file: 20260814171500.zip).",
              "Invalid timestamp in filename (400)"
            );
          } else {
            showToast("error", msg || "Permintaan impor data tidak valid.", "Bad Request (400)");
          }
        } else if (res.status === 404) {
          showToast(
            "error",
            "Data ekspor dengan timestamp tersebut tidak ditemukan pada database riwayat.",
            "No matching export data in database (404)"
          );
        } else if (res.status === 500) {
          showToast(
            "error",
            msg || "Terjadi kesalahan internal server/database saat mengekstrak dan memulihkan file.",
            "Database / Server Error (500)"
          );
        } else {
          showToast("error", msg || "Gagal mengimpor file migrasi.", `Error (${res.status})`);
        }
        return;
      }

      showToast(
        "success",
        responseData.message || "Media dan data migrasi berhasil diimpor ke sistem.",
        "Impor Sukses"
      );

      // Reset form file
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh list
      fetchHistory();
    } catch (err: any) {
      showToast(
        "error",
        err.message || "Terjadi gangguan jaringan saat mengunggah file.",
        "Gagal Mengimpor"
      );
    } finally {
      setIsImporting(false);
    }
  };

  // ── 4. Filter Riwayat ─────────────────────────────────────────────────────
  const filteredHistory = historyList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const exporter = (item.exporter_username || "").toLowerCase();
    const importer = (item.importer_username || "").toLowerCase();
    const expDate = item.exported_at || "";
    const impDate = item.imported_at || "";
    return (
      exporter.includes(q) ||
      importer.includes(q) ||
      expDate.includes(q) ||
      impDate.includes(q) ||
      item.migrateID.toString().includes(q)
    );
  });

  // Statistik Ringkas
  const totalRecords = historyList.length;
  const totalImported = historyList.filter((h) => h.imported_at !== null).length;
  const lastExport = historyList.length > 0 ? parseAndFormatDate(historyList[0].exported_at) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-white space-y-8">
      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`rounded-2xl p-4 shadow-2xl border backdrop-blur-xl flex items-start gap-3.5 ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
                : toast.type === "error"
                ? "bg-red-950/90 border-red-500/40 text-red-100"
                : "bg-blue-950/90 border-blue-500/40 text-blue-100"
            }`}
          >
            <div className="text-xl flex-shrink-0 mt-0.5">
              {toast.type === "success" && "✅"}
              {toast.type === "error" && "⚠️"}
              {toast.type === "info" && "ℹ️"}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="font-bold text-sm leading-tight mb-0.5">{toast.title}</h4>
              )}
              <p className="text-xs leading-relaxed opacity-90 break-words">{toast.msg}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white text-base leading-none p-1 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white bg-clip-text">
              Migrasi & Cadangan Media
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Ekspor arsip cadangan folder media sistem atau impor arsip .zip untuk pemulihan data.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
        >
          {isLoading ? "Memuat..." : "Segarkan Data"}
        </button>
      </div>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#18181b]/80 border border-white/10 rounded-2xl p-4.5 flex items-center gap-4 shadow-sm">
          <div>
            <div className="text-md text-slate-400 font-medium">Total Ekspor</div>
            <div className="text-2xl font-bold text-white mt-0.5">{totalRecords}</div>
          </div>
        </div>

        <div className="bg-[#18181b]/80 border border-white/10 rounded-2xl p-4.5 flex items-center gap-4 shadow-sm">
          <div>
            <div className="text-md text-slate-400 font-medium">Berhasil Diimpor</div>
            <div className="text-2xl font-bold text-white mt-0.5">{totalImported}</div>
          </div>
        </div>

        <div className="bg-[#18181b]/80 border border-white/10 rounded-2xl p-4.5 flex items-center gap-4 shadow-sm">
          <div>
            <div className="text-md text-slate-400 font-medium">Ekspor Terakhir</div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {lastExport ? `${lastExport.date} (${lastExport.relative})` : "Belum ada"}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Menu: Ekspor & Impor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel 1: Ekspor Data */}
        <div className="lg:col-span-5 bg-[#18181b]/90 border border-white/10 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-xl text-red-400">
                📤
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Ekspor Cadangan Media</h2>
                <p className="text-xs text-slate-400">Unduh seluruh berkas direktori media (.zip)</p>
              </div>
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg shadow-red-950/50 transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isExporting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Mulai Ekspor & Unduh (.zip)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
            </p>
          </div>
        </div>

        {/* Panel 2: Impor Data */}
        <div className="lg:col-span-7 bg-[#18181b]/90 border border-white/10 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl text-blue-400">
                📥
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Impor Pemulihan Media</h2>
                <p className="text-xs text-slate-400">Pulihkan file media dari arsip .zip hasil ekspor</p>
              </div>
            </div>

            {/* Dropzone Upload */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10 scale-[0.99]"
                  : selectedFile
                  ? "border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10"
                  : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl flex-shrink-0">
                      📦
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-emerald-300 truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatBytes(selectedFile.size)} • Siap diunggah
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-xs transition-colors"
                    title="Hapus pilihan"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 py-2">
                  <div className="text-sm font-semibold text-slate-200">
                    Klik untuk memilih atau seret file <code className="text-blue-300">.zip</code> ke sini
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-5 relative z-10 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleImport}
              disabled={isImporting || !selectedFile}
              className="w-full sm:flex-1 py-3 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-950/50 transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isImporting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Sedang Mengimpor Media...</span>
                </>
              ) : (
                <>
                  <span>Mulai Impor & Ekstrak</span>
                </>
              )}
            </button>

            {selectedFile && (
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={isImporting}
                className="w-full sm:w-auto py-3 px-4 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
              >
                Batalkan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bagian Riwayat Migrasi */}
      <div className="bg-[#18181b]/90 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span>📜</span>
              <span>Riwayat Ekspor & Impor</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-normal">
                {filteredHistory.length} data
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Catatan lengkap aktivitas pembuatan dan pemulihan berkas migrasi sistem
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-72">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari akun atau tanggal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 transition-colors"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabel Riwayat */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">ID</th>
                <th className="py-3.5 px-4">Waktu Ekspor</th>
                <th className="py-3.5 px-4">Pengekspor</th>
                <th className="py-3.5 px-4">Waktu Impor</th>
                <th className="py-3.5 px-4">Pengimpor</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="w-6 h-6 rounded-full border-2 border-white/20 border-t-red-500 animate-spin" />
                      <span className="text-xs">Memuat riwayat migrasi...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-sm font-medium text-slate-400">
                        {searchQuery ? "Tidak ada riwayat yang cocok dengan pencarian" : "Belum ada riwayat ekspor atau impor"}
                      </span>
                      <p className="text-xs text-slate-600">
                        {searchQuery ? "Coba kata kunci lain" : "Klik tombol 'Mulai Ekspor' untuk membuat cadangan pertama"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const expFormatted = parseAndFormatDate(item.exported_at);
                  const impFormatted = parseAndFormatDate(item.imported_at);
                  const isImported = Boolean(item.imported_at);

                  return (
                    <tr
                      key={item.migrateID}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* ID */}
                      <td className="py-4 px-4 text-center font-mono text-slate-400 font-medium">
                        #{item.migrateID}
                      </td>

                      {/* Exported At (Tanggal & Waktu terpisah) */}
                      <td className="py-4 px-4">
                        {expFormatted ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-white text-xs">
                              {expFormatted.date}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block font-semibold text-white text-[10px]">
                                {expFormatted.time}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({expFormatted.relative})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono">-</span>
                        )}
                      </td>

                      {/* Exporter Username */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center justify-center text-[10px] font-bold">
                            {(item.exporter_username || "U")[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-200">
                            {item.exporter_username || "Tidak diketahui"}
                          </span>
                        </div>
                      </td>

                      {/* Imported At (Tanggal & Waktu terpisah) */}
                      <td className="py-4 px-4">
                        {impFormatted ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-white text-xs">
                              {impFormatted.date}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block text-white font-semibold text-[10px]">
                                {impFormatted.time}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({impFormatted.relative})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">
                            Belum pernah diimpor
                          </span>
                        )}
                      </td>

                      {/* Importer Username */}
                      <td className="py-4 px-4">
                        {item.importer_username ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold">
                              {item.importer_username[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-200">
                              {item.importer_username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {isImported ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Telah Diimpor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Hanya Diekspor
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}