// ⚠️ TEMPORARY: Halaman ini bisa diakses tanpa login.
// Hapus atau pasang balik proteksi auth setelah selesai digunakan.
"use client";

import KelolaSertifikat from '../../components/subdashboard/KelolaSertifikat';

export default function SertifPage() {
  return (
    <div className="min-h-screen bg-[#0f0f11]">
      <KelolaSertifikat />
    </div>
  );
}
