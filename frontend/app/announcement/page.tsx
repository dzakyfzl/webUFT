import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { AnnouncementHero } from "./announcement-hero";
import { AnnouncementIntro } from "./announcement-intro";
import { AnnouncementResults } from "./announcement-results";
import { selectionAnnouncement } from "./selection-data";
import styles from "./announcement.module.css";

export const metadata: Metadata = {
  title: "Pengumuman Hasil Seleksi | UKM Fotografi Telkom",
  description: "Pengumuman hasil seleksi dan penempatan anggota baru UKM Fotografi Telkom per departemen.",
};

export default function AnnouncementPage() {
  const { departments, isDemo, period } = selectionAnnouncement;
  const hasResults = departments.some(department => department.members.length > 0);

  return (
    <div className={styles.page} lang="id">
      <AnnouncementIntro />
      <header className={styles.header}>
        <nav className={styles.shell} aria-label="Navigasi utama">
          <Link href="/" aria-label="UKM Fotografi Telkom, beranda">
            <Image src="/logo-uft.png" alt="" width={34} height={34} unoptimized />
          </Link>
          <Link href="/" className={styles.back}>
            <ArrowLeft size={17} aria-hidden="true" /> Beranda
          </Link>
        </nav>
      </header>

      <main className={styles.shell}>
        <AnnouncementHero>
          <h1 id="announcement-title">Pengumuman<br />Hasil Seleksi</h1>
          <p>{isDemo ? "Simulasi penempatan anggota baru UKM Fotografi Telkom." : `Penempatan anggota baru UKM Fotografi Telkom${period ? ` periode ${period}` : ""}.`}</p>
          <a href="#hasil-seleksi" className={styles.jump}>
            Lihat hasil seleksi <ArrowDown size={17} aria-hidden="true" />
          </a>
        </AnnouncementHero>

        <section className={styles.results} aria-labelledby="hasil-seleksi">
          {hasResults ? <AnnouncementResults departments={departments} isDemo={isDemo} /> : (
            <>
              <div className={styles.resultsHeading}>
                <h2 id="hasil-seleksi" tabIndex={-1}>Hasil per departemen</h2>
              </div>
              <div className={styles.empty}>
                <p>Hasil seleksi belum diumumkan.</p>
                <p>Daftar peserta yang lolos akan tampil di sini setelah hasil resmi diterbitkan.</p>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className={`${styles.shell} ${styles.footer}`}>
        <span>UKM Fotografi Telkom</span>
      </footer>
    </div>
  );
}
