"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import Toast from "../../components/Toast";
import type { Acara, Koleksi } from "../../components/types";

type ApiAcara = {
  acaraID: number;
  nama: string;
  deskripsi?: string | null;
  tempat?: string | null;
  waktu?: string | null;
  status?: string | null;
  fileID?: number | null;
};

type ApiKarya = {
  karyaID: number;
  nama?: string | null;
  deskripsi?: string | null;
  pemilik?: string | null;
  fileID?: number | null;
};

type VoteForm = {
  nama: string;
  nim: string;
  universitas: string;
};

const fallbackImage = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200";

const MOCK_WORKS: Koleksi[] = [
  { id: 1001, title: "Cahaya Pagi di Braga", photographer: "Alya Rahma", category: "Street Photography", image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=800", span: "", description: "Pantulan cahaya pagi yang membingkai aktivitas kota sebelum jalanan mulai ramai.", exif: "Fujifilm X-T4 / 35mm / f/2.0" },
  { id: 1002, title: "Ruang yang Tenang", photographer: "Raka Pratama", category: "Architecture", image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=800", span: "", description: "Garis dan cahaya dalam sebuah ruang sederhana yang menghadirkan jeda di tengah kesibukan.", exif: "Sony A7III / 24mm / f/5.6" },
  { id: 1003, title: "Menyusuri Senja", photographer: "Nadia Putri", category: "Landscape", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=800", span: "", description: "Perjalanan pulang yang direkam dalam warna hangat dan bayangan panjang.", exif: "Canon EOS R5 / 50mm / f/4.0" },
  { id: 1004, title: "Wajah Kota", photographer: "Dimas Aditya", category: "Portrait", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800", span: "", description: "Potret seorang warga yang menyimpan cerita panjang tentang perubahan kota.", exif: "Nikon Z6 / 85mm / f/1.8" },
  { id: 1005, title: "Di Balik Jendela", photographer: "Fajar Maulana", category: "Documentary", image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=800", span: "", description: "Momen kecil yang terlihat dari balik jendela, antara ruang pribadi dan kehidupan jalanan.", exif: "Leica Q2 / 28mm / f/2.8" },
  { id: 1006, title: "Jejak Setelah Hujan", photographer: "Sinta Lestari", category: "Experimental", image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=800", span: "", description: "Tekstur air dan cahaya yang menyusun ulang lanskap setelah hujan reda.", exif: "Sony A6400 / 50mm / f/2.8" },
];

const imageUrl = (fileID?: number | null) =>
  fileID ? `/api/file/ambil/${fileID}` : fallbackImage;

const fallbackEvent = (params: URLSearchParams, id: string): Acara => ({
  id,
  title: params.get("title") || "Detail Acara",
  description: params.get("description") || "Informasi acara belum tersedia.",
  waktu: params.get("waktu") || "Waktu akan diumumkan",
  tempat: params.get("tempat") || "Lokasi akan diumumkan",
  image: params.get("image") || fallbackImage,
  link: `/acara/${id}`,
  status: "Mendatang",
});

export default function AcaraDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<Acara | null>(null);
  const [works, setWorks] = useState<Koleksi[]>([]);
  const [selectedWork, setSelectedWork] = useState<Koleksi | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [form, setForm] = useState<VoteForm>({ nama: "", nim: "", universitas: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    let isCurrent = true;

    const loadEvent = async () => {
      setIsLoading(true);
      const localEvent = fallbackEvent(searchParams, params.id);

      try {
        const eventResponse = await fetch(`/api/acara/ambil/${encodeURIComponent(params.id)}`);
        if (!eventResponse.ok) throw new Error("Acara tidak ditemukan");
        const apiEvent: ApiAcara = await eventResponse.json();
        const loadedEvent: Acara = {
          id: apiEvent.acaraID,
          title: apiEvent.nama,
          description: apiEvent.deskripsi ?? "",
          waktu: apiEvent.waktu ?? "",
          tempat: apiEvent.tempat ?? "",
          image: imageUrl(apiEvent.fileID),
          link: `/acara/${apiEvent.acaraID}`,
          status: apiEvent.status ?? "",
        };
        if (!isCurrent) return;
        setEvent(loadedEvent);

        const worksResponse = await fetch(`/api/karya/list/${apiEvent.acaraID}`);
        if (worksResponse.ok) {
          const apiWorks: ApiKarya[] = await worksResponse.json();
          const loadedWorks = apiWorks.map((work) => ({
            id: work.karyaID,
            title: work.nama ?? "Karya tanpa judul",
            photographer: work.pemilik ?? "Anonim",
            category: "Karya peserta",
            image: imageUrl(work.fileID),
            span: "",
            description: work.deskripsi ?? "",
            exif: "",
          }));
          setWorks(loadedWorks.length > 0 ? loadedWorks : MOCK_WORKS);
        } else {
          setWorks(MOCK_WORKS);
        }
      } catch {
        if (isCurrent) {
          setEvent(localEvent);
          setWorks(MOCK_WORKS);
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadEvent();
    return () => {
      isCurrent = false;
    };
  }, [params.id, searchParams]);

  const submitVote = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!event || !selectedWork) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      if (typeof event.id !== "number") {
        setMessage("Mode mockup: pilihan kamu berhasil dicatat untuk pengujian form.");
        setForm({ nama: "", nim: "", universitas: "" });
        return;
      }

      // ── LANGKAH 1: Ambil GPS dari browser (STRICT) ──────────────────────────
      let gpsPayload: { latitude?: number; longitude?: number; accuracy?: number } = {};

      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          });
          gpsPayload = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        } catch (geoErr) {
          const err = geoErr as GeolocationPositionError;
          let msg = "Aktifkan akses lokasi di pengaturan browser untuk bisa vote.";
          if (err.code === 1) msg = "Izin lokasi ditolak. Aktifkan akses lokasi di pengaturan browser.";
          if (err.code === 2) msg = "Lokasi tidak dapat dideteksi. Pastikan GPS aktif dan coba di area terbuka.";
          if (err.code === 3) msg = "Waktu pencarian lokasi habis. Coba lagi dalam beberapa saat.";
          setGpsError(msg);
          setIsSubmitting(false);
          return; // STOP — tidak kirim request jika GPS gagal
        }
      }
      // ── End GPS ─────────────────────────────────────────────────────────────

      const response = await fetch(`/api/form/isi/${event.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          nim: form.nim,
          prodi_instansi: form.universitas,
          karyaID: selectedWork.id,
          ...gpsPayload,  // latitude, longitude, accuracy (jika berhasil didapat)
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Voting belum berhasil dikirim.");
      setMessage("Pilihan kamu sudah tercatat. Terima kasih sudah ikut memilih.");
      setForm({ nama: "", nim: "", universitas: "" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Voting belum berhasil dikirim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-slate-600">Memuat detail acara...</main>;
  }

  if (!event) {
    return <main className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-slate-600">Acara tidak ditemukan.</main>;
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      {gpsError && (
        <Toast
          message={gpsError}
          type="error"
          duration={6000}
          onClose={() => setGpsError(null)}
        />
      )}
      <section className="relative isolate flex min-h-[420px] items-end overflow-hidden bg-slate-950 px-4 py-10 sm:min-h-[520px] sm:px-8 sm:py-14">
        <Image src={event.image} alt="" fill aria-hidden="true" className="-z-20 scale-110 object-cover opacity-45 blur-2xl" unoptimized />
        <Image src={event.image} alt="" fill aria-hidden="true" className="-z-10 object-cover opacity-35" unoptimized />
        <div className="absolute inset-0 -z-10 bg-slate-950/45" />
        <div className="mx-auto w-full max-w-7xl text-white">
          <Link href="/" className="mb-12 inline-flex text-xs font-semibold uppercase tracking-[0.16em] text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Kembali ke beranda</Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200">{event.status || "Acara UFT"}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[0.95] sm:text-6xl md:text-7xl">{event.title}</h1>
          <div className="mt-6 flex flex-col gap-2 text-sm text-stone-200 sm:flex-row sm:gap-8">
            <span>{event.waktu}</span>
            <span>{event.tempat}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Tentang acara</p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight">Pilih karya favoritmu.</h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600">{event.description}</p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600">Pilih satu foto untuk memberikan suara. Isi data mahasiswa agar pilihanmu dapat diverifikasi oleh panitia.</p>
        </div>

        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Karya peserta</p>
              <h2 className="mt-2 text-2xl font-bold">{works.length > 0 ? `${works.length} karya` : "Karya akan segera hadir"}</h2>
            </div>
          </div>
          {works.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {works.map((work) => {
                const isHovered = hoveredId === work.id;
                return (
                <button
                    key={work.id}
                    type="button"
                    onClick={() => {
                      setSelectedWork(work);
                      setMessage("");
                      setModalOpen(true);
                    }}
                    onMouseEnter={() => setHoveredId(work.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4"
                  >
                  {/* Container foto — tanpa rounded, shadow naik saat hover */}
                  <div
                    className="relative aspect-[4/5] overflow-hidden bg-stone-200"
                    style={{
                      boxShadow: isHovered
                        ? '0 12px 32px rgba(0,0,0,0.32)'
                        : '0 2px 8px rgba(0,0,0,0.10)',
                      transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                      transition: 'box-shadow 0.22s ease, transform 0.22s ease',
                    }}
                  >
                    <Image
                      src={work.image}
                      alt={work.title}
                      fill
                      className="object-cover"
                      style={{
                        transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                        transition: 'transform 0.3s ease',
                      }}
                      unoptimized
                    />
                    {/* Overlay gelap saat hover */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: isHovered ? 'rgba(15,23,42,0.42)' : 'rgba(15,23,42,0)',
                        transition: 'background 0.22s ease',
                      }}
                    />


                  </div>
                  <p
                    className="mt-2 line-clamp-1 text-sm font-bold"
                    style={{
                      color: isHovered ? '#dc2626' : '',
                      transition: 'color 0.18s ease',
                    }}
                  >
                    {work.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-600">{work.photographer}</p>
                </button>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-stone-300 p-8 text-sm text-slate-600">Belum ada karya untuk acara ini.</div>
          )}
        </div>
      </section>

      {/* ── MODAL POPUP KARYA ──────────────────────────────────────── */}
      {modalOpen && selectedWork && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Detail karya: ${selectedWork.title}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-4xl overflow-hidden bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
            {/* Tombol tutup */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center bg-white/90 text-slate-700 shadow transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              aria-label="Tutup"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" style={{ maxHeight: "90vh" }}>
              {/* Gambar karya */}
              <div className="relative min-h-[260px] bg-stone-100 lg:min-h-0">
                <Image
                  src={selectedWork.image}
                  alt={selectedWork.title}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              {/* Info + form vote */}
              <div className="overflow-y-auto p-7 sm:p-9" style={{ maxHeight: "90vh" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Pilih karya ini</p>
                <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">{selectedWork.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedWork.photographer}</p>
                {selectedWork.description && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{selectedWork.description}</p>
                )}

                <form
                  onSubmit={async (e) => {
                    await submitVote(e);
                  }}
                  className="mt-7 space-y-4"
                >
                  <label className="block text-sm font-semibold">
                    Nama lengkap
                    <input
                      required
                      value={form.nama}
                      onChange={(input) => setForm({ ...form, nama: input.target.value })}
                      className="mt-2 block w-full border border-stone-300 px-3 py-3 font-normal outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200"
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    NIM mahasiswa
                    <input
                      required
                      value={form.nim}
                      onChange={(input) => setForm({ ...form, nim: input.target.value })}
                      className="mt-2 block w-full border border-stone-300 px-3 py-3 font-normal outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200"
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Asal universitas
                    <input
                      required
                      value={form.universitas}
                      onChange={(input) => setForm({ ...form, universitas: input.target.value })}
                      className="mt-2 block w-full border border-stone-300 px-3 py-3 font-normal outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Mengirim..." : "Kirim vote"}
                  </button>
                  {message && (
                    <p role="status" className="text-sm text-slate-600">{message}</p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── END MODAL ─────────────────────────────────────────────────── */}
    </main>
  );
}
