"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import type { DepartmentResult } from "./selection-data";
import styles from "./announcement.module.css";

export function AnnouncementResults({ departments, isDemo }: { departments: readonly DepartmentResult[]; isDemo?: boolean }) {
  const [query, setQuery] = useState("");
  const terms = query.trim().toLocaleLowerCase("id-ID").split(/\s+/).filter(Boolean);
  const results = departments.map(department => ({
    ...department,
    acceptedCount: department.members.length,
    members: department.members.filter(member => {
      const searchable = `${member.name} ${department.name} ${member.division ?? ""}`.toLocaleLowerCase("id-ID");
      return terms.every(term => searchable.includes(term));
    }),
  })).filter(department => department.members.length > 0);

  return (
    <>
      <div className={styles.resultsHeading}>
        <div>
          <h2 id="hasil-seleksi" tabIndex={-1}>Hasil per departemen</h2>
          {isDemo && <p className={styles.demoNotice}><strong>Data simulasi.</strong> Nama dan penempatan di daftar ini fiktif.</p>}
        </div>
        <label className={styles.search}>
          <span className="sr-only">Cari nama atau departemen</span>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama atau departemen" />
        </label>
      </div>
      <p className={results.length ? "sr-only" : styles.empty} role="status">
        {results.length ? `${results.reduce((count, department) => count + department.members.length, 0)} hasil ditemukan.` : "Tidak ada hasil yang cocok dengan pencarianmu."}
      </p>
      {results.map(department => (
        <div className={styles.department} key={department.name}>
          <div>
            <h3>{department.name}</h3>
            <p>
              {department.members.length < department.acceptedCount
                ? `Menampilkan ${department.members.length} dari ${department.acceptedCount}`
                : department.acceptedCount} peserta lolos
            </p>
          </div>
          <ul className={styles.members}>
            {department.members.map((member, index) => (
              <li key={`${member.name}-${index}`}>
                <span>{member.name}</span>
                {member.division && <span>{member.division}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
