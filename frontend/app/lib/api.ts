import type { Acara, Koleksi } from "../components/types";

// ---------------------------------------------------------------------------
// FAKE DATA — aktifkan dengan NEXT_PUBLIC_USE_FAKE_DATA=true di .env.local
// Dipakai saat backend belum jalan / tidak bisa dijangkau untuk keperluan
// development & testing tampilan.
// ---------------------------------------------------------------------------
const USE_FAKE_DATA = process.env.NEXT_PUBLIC_USE_FAKE_DATA === "true";

const FAKE_KOLEKSI: Koleksi[] = [
  {
    id: 1,
    title: "Urban Solitude",
    photographer: "Budi Santoso",
    category: "Street",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800",
    span: "md:col-span-1 md:row-span-2",
    description: "Kesunyian di tengah hiruk pikuk kota — momen yang sering terlewatkan.",
    exif: "f/2.8 · 1/250s · ISO 400 · 35mm",
  },
  {
    id: 2,
    title: "Golden Hour",
    photographer: "Anisa Putri",
    category: "Landscape",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800",
    span: "md:col-span-2 md:row-span-1",
    description: "Cahaya keemasan yang hanya bertahan beberapa menit.",
    exif: "f/8 · 1/60s · ISO 100 · 24mm",
  },
  {
    id: 3,
    title: "Pasar Pagi",
    photographer: "Rizky Aditya",
    category: "Documentary",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800",
    span: "md:col-span-1 md:row-span-1",
    description: "Aktivitas pagi di pasar tradisional yang penuh energi.",
    exif: "f/4 · 1/125s · ISO 800 · 50mm",
  },
  {
    id: 4,
    title: "Refleksi Hujan",
    photographer: "Dewi Larasati",
    category: "Street",
    image: "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?q=80&w=800",
    span: "md:col-span-1 md:row-span-1",
    description: "Pantulan lampu kota di jalanan basah setelah hujan.",
    exif: "f/1.8 · 1/30s · ISO 3200 · 50mm",
  },
  {
    id: 5,
    title: "Arsitektur Tua",
    photographer: "Fajar Nugroho",
    category: "Architecture",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=800",
    span: "md:col-span-2 md:row-span-2",
    description: "Detail ornamen bangunan kolonial yang masih kokoh berdiri.",
    exif: "f/5.6 · 1/100s · ISO 200 · 28mm",
  },
  {
    id: 6,
    title: "Senja di Dermaga",
    photographer: "Hana Wijaya",
    category: "Landscape",
    image: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?q=80&w=800",
    span: "md:col-span-1 md:row-span-1",
    description: "Siluet perahu nelayan saat matahari tenggelam.",
    exif: "f/11 · 1/200s · ISO 100 · 70mm",
  },
];

const FAKE_EVENTS: Acara[] = [
  {
    id: "fake-1",
    title: "Workshop Dasar Fotografi",
    description: "Kelas intensif untuk anggota baru yang ingin memahami dasar-dasar fotografi, mulai dari mengenal kamera hingga teknik komposisi sederhana.",
    waktu: "15 September 2026, 09.00 WIB",
    tempat: "Gedung Student Center Lantai 3, Telkom University",
    image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=1200",
    link: "#acara",
    status: "Segera",
  },
  {
    id: "fake-2",
    title: "Hunting Foto: Kota Tua Bandung",
    description: "Eksplorasi sudut-sudut bersejarah Kota Bandung bersama anggota UFT. Abadikan cerita di balik bangunan tua dan kehidupan masyarakat sekitarnya.",
    waktu: "22 September 2026, 07.00 WIB",
    tempat: "Alun-Alun Kota Bandung",
    image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1200",
    link: "#acara",
    status: "Pendaftaran Dibuka",
  },
  {
    id: "fake-3",
    title: "Pameran Karya Tahunan UFT 2026",
    description: "Ajang tahunan untuk mempertontonkan karya terbaik anggota UFT kepada publik. Tahun ini mengusung tema 'Manusia dan Ruang'.",
    waktu: "1–7 Oktober 2026",
    tempat: "Galeri Seni Kampus Telkom University",
    image: "https://images.unsplash.com/photo-1531243501393-a8996d8f527b?q=80&w=1200",
    link: "#acara",
    status: "Coming Soon",
  },
];

// --- Layout span patterns for masonry grid ---
const SPAN_PATTERNS = [
  "md:col-span-1 md:row-span-2",
  "md:col-span-2 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-2 md:row-span-2",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-2",
  "md:col-span-2 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-2 md:row-span-2",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-2",
];

type AlbumSummary = {
  albumID: number;
  nama: string;
  deskripsi: string;
};

type AlbumDetail = {
  album: { albumID: number; nama: string; deskripsi: string };
  fotos: Array<{ fotoID: number; nama: string; pemilik: string; fileID: number }>;
};

/**
 * Fetches all albums, then for each album fetches its detail (with fotos).
 * Flattens the result into a Koleksi[] array usable by the landing page gallery.
 *
 * Image URLs use the backend file endpoint: /api/file/ambil/{fileID}
 */
export async function fetchGalleryData(): Promise<Koleksi[]> {
  // Gunakan fake data jika flag aktif (untuk testing tanpa backend)
  if (USE_FAKE_DATA) {
    console.info("[api] NEXT_PUBLIC_USE_FAKE_DATA=true — menggunakan fake gallery data.");
    return FAKE_KOLEKSI;
  }

  try {
    // 1. Get all albums
    const albumsRes = await fetch("/api/album/ambil-semua");
    if (!albumsRes.ok) {
      throw new Error(`Gagal mengambil daftar album (status ${albumsRes.status})`);
    }
    const albums: AlbumSummary[] = await albumsRes.json();

    if (!Array.isArray(albums) || albums.length === 0) {
      return [];
    }

    // 2. For each album, fetch detail (which includes fotos)
    const detailPromises = albums.map(async (album): Promise<AlbumDetail | null> => {
      try {
        const res = await fetch(`/api/album/ambil/${album.albumID}`);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailPromises);

    // 3. Flatten all fotos into Koleksi items
    const koleksiItems: Koleksi[] = [];
    let globalIndex = 0;

    for (const detail of details) {
      if (!detail || !detail.fotos || detail.fotos.length === 0) continue;

      for (const foto of detail.fotos) {
        koleksiItems.push({
          id: foto.fotoID,
          title: foto.nama,
          photographer: foto.pemilik,
          category: detail.album.nama,
          image: `/api/file/ambil/${foto.fileID}`,
          span: SPAN_PATTERNS[globalIndex % SPAN_PATTERNS.length],
          description: detail.album.deskripsi || undefined,
          exif: undefined,
        });
        globalIndex++;
      }
    }

    return koleksiItems;
  } catch (err) {
    // Jika backend tidak bisa dijangkau, lempar error dengan pesan yang ramah
    const message = err instanceof Error ? err.message : "Tidak dapat terhubung ke server.";
    throw new Error(message);
  }
}

// --- Backend Acara type (SQLAlchemy model serialized by FastAPI) ---
type AcaraBackend = {
  acaraID: number;
  fileID: number | null;
  nama: string;
  deskripsi: string | null;
  tempat: string | null;
  waktu: string | null;
  status: string | null;
};

/**
 * Formats a backend datetime string into a human-readable Indonesian date.
 * Falls back to the raw string if parsing fails.
 */
function formatWaktu(waktu: string | null): string {
  if (!waktu) return "Belum ditentukan";
  try {
    const date = new Date(waktu);
    if (isNaN(date.getTime())) return waktu;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return waktu;
  }
}

/**
 * Fetches public events from the backend.
 * Maps the backend Acara entities to the frontend Acara type.
 */
export async function fetchEventsData(): Promise<Acara[]> {
  // Gunakan fake data jika flag aktif (untuk testing tanpa backend)
  if (USE_FAKE_DATA) {
    console.info("[api] NEXT_PUBLIC_USE_FAKE_DATA=true — menggunakan fake events data.");
    return FAKE_EVENTS;
  }

  try {
    const res = await fetch("/api/acara/list");
    if (!res.ok) {
      throw new Error(`Gagal mengambil daftar acara (status ${res.status})`);
    }
    const acaras: AcaraBackend[] = await res.json();

    if (!Array.isArray(acaras) || acaras.length === 0) {
      return [];
    }

    return acaras.map((acara) => ({
      id: acara.acaraID,
      title: acara.nama,
      description: acara.deskripsi || "",
      waktu: formatWaktu(acara.waktu),
      tempat: acara.tempat || "Belum ditentukan",
      image: acara.fileID ? `/api/file/ambil/${acara.fileID}` : "",
      link: `#acara`,
      status: acara.status || "",
    }));
  } catch (err) {
    // Jika backend tidak bisa dijangkau, lempar error dengan pesan yang ramah
    const message = err instanceof Error ? err.message : "Tidak dapat terhubung ke server.";
    throw new Error(message);
  }
}
