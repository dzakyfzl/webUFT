# Frontend & Animation Rules

Dokumen hidup — aturan animasi frontend yang disetujui melalui percakapan dan interactive preview.

**Versi:** 1.1 · **Diperbarui:** 19 November 2026 · **Status:** RULE-001 s.d. RULE-010 tercatat.

**Penting:** Perilaku animasi adalah spesifikasi yang harus diikuti. Angka timing/fisika di bawah merupakan *baseline dari playground* yang sudah disukai, tetap dapat dikalibrasi; nilai `scale(0.97)` untuk popup dan tombol adalah nilai yang diminta secara eksplisit.

## RULE-001 — Popup & initial component entrance

**Status:** Konfirmasi pengguna (nilai scale awal dan akhir). Detail easing/durasi di bawah adalah saran implementasi, bukan keputusan final.

### Inti aturan
Saat popup, modal, atau komponen yang muncul ketika halaman pertama kali ditampilkan menggunakan animasi *scale-in*, **jangan mulai dari `scale(0)`**. Mulai dari **`scale(0.97)`** dan akhiri pada **`scale(1)`**.

- **Initial scale:** `0.97` (97% dari ukuran akhir).
- **Final scale:** `1` (100% ukuran akhir).
- **Hindari:** animasi `scale(0) -> scale(1)` yang memberikan efek muncul terlalu ekstrem.
- **Opacity:** boleh dianimasikan terpisah (`0 -> 1`) jika diperlukan; tidak sama dengan skala.
- **Cakupan:** popup dan komponen dengan animasi masuk ketika halaman pertama kali muncul. Jangan memaksakan efek pada komponen yang tidak dianimasikan.

### Saran implementasi (sementara)

```css
.entering {
  opacity: 0;
  transform: scale(0.97);
  transform-origin: center;
  transition: transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
              opacity 240ms ease-out;
}
.entering.is-visible {
  opacity: 1;
  transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .entering { transition: none; }
}
```

### Storyboard visual

`Frame 1 [97% ukuran akhir]` → `Frame 2 [membesar halus]` → `Frame 3 [100% ukuran akhir]`

> Yang dikunci dari penjelasan pengguna adalah **awal di 0.97, bukan 0**. Kecepatan, easing, dan opacity masih dapat disesuaikan.

## RULE-002 — Button press feedback
Saat tombol aksi (Submit, Add to Cart, dan sejenisnya) ditekan, gunakan `transform: scale(0.97)` selama ditekan dan kembalikan ke `scale(1)` ketika dilepas. Gunakan `:active` atau pointer state; jangan mengubah layout.

```css
.action-button { transition: transform 140ms ease-out; }
.action-button:active { transform: scale(0.97); }
```

**Storyboard:** idle (100%) → pressed (97%) → released (100%).

## RULE-003 — Validation error shake
Input yang gagal validasi tidak cukup hanya diberi border merah. Berikan shake horizontal singkat untuk menegaskan error, dan pesan kesalahan yang bisa dibaca. Jalankan ulang shake saat validasi gagal lagi, tetapi jangan terus-menerus bergetar.

```css
.field[aria-invalid="true"] { border-color: #dc3545; }
.field.shake { animation: error-shake 350ms ease-in-out; }
@keyframes error-shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-7px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(2px); }
}
```

**Storyboard:** normal → red border + horizontal shake → red border + readable error message.

## RULE-004 — Directional stepper transitions

**Keputusan:** Jangan mengganti step hanya dengan fade. Gerak **harus menyampaikan arah navigasi**.

- **Next / Forward:** konten lama bergerak keluar ke **kiri** (`translateX(-100%)`); konten baru masuk dari **kanan** (`translateX(100%) → 0`).
- **Back / Previous:** konten lama keluar ke **kanan** (`translateX(100%)`); konten baru masuk dari **kiri** (`translateX(-100%) → 0`).
- Kedua panel dapat bergerak bersamaan; viewport di-`overflow: hidden` sehingga tidak keluar area.
- Update indikator step dan state navigasi sesuai step tujuan. Hindari klik ganda yang membuat dua transisi saling menimpa.
- Gunakan `transform` untuk perpindahan, bukan `left`/`top`. Pada `prefers-reduced-motion`, perubahan step berlangsung tanpa slide.

**Baseline preview:** `380ms cubic-bezier(0.22, 1, 0.36, 1)`.

```css
.step-viewport { position: relative; overflow: hidden; }
.step-panel { position: absolute; inset: 0; }
.next-enter { animation: enter-right 380ms cubic-bezier(.22,1,.36,1) both; }
.next-exit  { animation: exit-left  380ms cubic-bezier(.22,1,.36,1) both; }
.back-enter { animation: enter-left  380ms cubic-bezier(.22,1,.36,1) both; }
.back-exit  { animation: exit-right 380ms cubic-bezier(.22,1,.36,1) both; }
@keyframes enter-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes exit-left   { to { transform: translateX(-100%); } }
@keyframes enter-left  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes exit-right  { to { transform: translateX(100%); } }
```

**Visual storyboard:**

```text
NEXT:  [ STEP 1 ]  ←  [ STEP 2 ]
BACK:  [ STEP 1 ]  →  [ STEP 2 ]
```

**Acceptance check:** Tombol Next lalu Back memperlihatkan animasi yang benar-benar berlawanan arah, bukan fade atau pop-in.

## RULE-005 — Smooth accordion size interpolation

**Keputusan:** Accordion harus expand/collapse ke **tinggi konten sebenarnya**, tanpa melompat ketika mencapai `auto`.

- Gunakan `interpolate-size: allow-keywords` untuk transisi antara `height: 0` dan `height: auto` pada browser yang mendukung.
- Sediakan fallback yang terlihat halus, misalnya `grid-template-rows: 0fr → 1fr` dengan overflow terkontrol, atau pengukuran `scrollHeight` untuk kasus kompleks.
- Hindari `max-height: 999px` atau angka arbitrer: timing-nya tidak konsisten terhadap panjang konten.
- Klik bagian yang terbuka dapat menutupnya kembali; jika produk menggunakan mode single-open, membuka bagian lain menutup yang lama.
- Konten tertutup tidak boleh dapat di-tab/fokus; tombol trigger harus mempertahankan `aria-expanded` dan `aria-controls`.

**Baseline preview:** `320ms cubic-bezier(0.25, 0.8, 0.25, 1)`.

```css
.accordion-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 320ms cubic-bezier(.25,.8,.25,1);
}
.accordion-panel > .accordion-inner { min-height: 0; overflow: hidden; }
.accordion-item.is-open .accordion-panel { grid-template-rows: 1fr; }

@supports (interpolate-size: allow-keywords) {
  .accordion { interpolate-size: allow-keywords; }
  .accordion-panel { display: block; height: 0; overflow: clip; transition: height 320ms cubic-bezier(.25,.8,.25,1); }
  .accordion-item.is-open .accordion-panel { height: auto; }
}
```

**Storyboard:** collapsed (`0`) → tinggi bertambah mulus → expanded (`auto`) → mengecil mulus saat ditutup.

**Acceptance check:** Buka/tutup FAQ dengan jawaban pendek maupun panjang; tidak ada height snap atau konten yang menembus container.

## RULE-006 — Transform-based movement

**Keputusan:** Untuk gerak posisi visual, **prioritaskan `transform`**, bukan animasi CSS `top` atau `left` per frame.

- Gunakan `translateX(...)`, `translateY(...)`, `translate3d(...)`, `scale(...)`, dan `rotate(...)` sesuai arah/efek.
- `top`/`left` tetap boleh digunakan untuk **posisi layout statis**. Larangan berlaku untuk mengubahnya terus-menerus selama animasi; perubahan tersebut dapat memicu layout/paint.
- Perubahan `transform` dan `opacity` biasanya dapat ditangani lebih efisien oleh compositor, namun tetap perlu profiling untuk kasus berat.
- Gunakan `will-change: transform` hanya secara selektif pada elemen yang benar-benar bergerak, bukan semua elemen.

```css
.moving-item { transform: translate3d(var(--x, 0px), 0, 0); transition: transform 150ms ease-out; }
/* Hindari: animasi left: 0px → 200px berulang kali. */
```

**Storyboard:** slider 0% → 50% → 100% memindahkan elemen sepanjang jalur tanpa memindahkan layout elemen di sekitarnya.

**Acceptance check:** Di DevTools, properti yang berubah tiap frame adalah `transform`, bukan `left`/`top`.

## RULE-007 — Disable transitions during theme switching

**Keputusan:** Saat berpindah light↔dark, **sementara nonaktifkan decorative transitions** agar warna, bayangan, dan elemen lain tidak beranimasi massal dan tampak glitchy.

- Tambahkan class penonaktif transisi pada root **sebelum** mengganti atribut/class theme.
- Lakukan perubahan tema dan lepaskan class setelah style perubahan ter-render (mis. frame berikutnya atau dua `requestAnimationFrame` pada demo).
- Hindari mematikan transisi secara permanen; sesudah theme switch tombol dan interaksi lain harus normal kembali.
- Perhatikan tema sistem, mount pertama, dan penyimpanan preferensi agar tidak terjadi flash tema yang salah.

```css
.theme-switching,
.theme-switching *,
.theme-switching *::before,
.theme-switching *::after { transition: none !important; }
```

```js
function switchTheme(root, newTheme) {
  root.classList.add('theme-switching');
  root.dataset.theme = newTheme;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.classList.remove('theme-switching');
  }));
}
```

**Storyboard:** Light → (instantly change all theme tokens) → Dark, tanpa gelombang transisi elemen satu per satu.

**Acceptance check:** Ganti tema berulang kali; tidak ada animasi warna serentak yang mengganggu, dan hover/click transitions tetap berfungsi sesudahnya.

## RULE-008 — Tooltip delay grouping

**Keputusan:** Tooltip pertama dalam sesi eksplorasi singkat boleh menunggu; **tooltip-tooltip berikutnya langsung muncul**.

- Pointer hover pertama: delay untuk menghindari tooltip muncul saat pointer hanya lewat.
- Setelah satu tooltip terbuka, tooltip lain dalam satu grup tampil **tanpa delay** saat pengguna pindah target.
- Saat pointer keluar, pertahankan *warm/grace period*; setelah masa ini berakhir, tooltip berikutnya kembali menggunakan delay pertama.
- Fokus keyboard, click/touch, serta pembacaan screen reader tidak boleh diperlambat secara merugikan. Gunakan `role="tooltip"` dan `aria-describedby` sesuai kebutuhan.
- Batalkan timer ketika pointer meninggalkan target sebelum delay selesai; jangan tampilkan tooltip telat di lokasi yang sudah ditinggalkan.

**Baseline preview:** `firstDelay = 450ms`, `subsequentDelay = 0ms`, `gracePeriod = 1400ms`.

```js
const delay = tooltipVisible || Date.now() < warmUntil ? 0 : 450;
// On hide, after a tooltip was visible:
warmUntil = Date.now() + 1400;
```

**Storyboard:** hover A (450ms) → tooltip A; geser ke B (0ms) → tooltip B; tunggu ~1.4s tanpa tooltip → hover C (450ms).

**Acceptance check:** Pindah cepat antar-icon terasa snappy; hover pertama setelah jeda tidak terlalu agresif.

## RULE-009 — Velocity-aware spring physics for flicks

**Keputusan:** Release dari drag/flick harus merespons **kecepatan pelepasan**; jangan selalu menggunakan animasi fixed-duration.

- Saat drag, elemen mengikuti pointer secara langsung menggunakan `transform: translate3d`.
- Ukur velocity dari `Δx / Δt` dalam pointer move; saat dilepas, gunakan velocity sebagai **initial spring velocity**.
- Tentukan anchor/snap target berdasarkan posisi dan proyeksi kecepatan. Flick cepat terasa berbeda dengan release pelan meski berakhir di anchor yang sama.
- Terapkan stiffness/damping agar posisi kembali stabil; hentikan animasi ketika perpindahan dan velocity cukup kecil.
- Abort spring sebelumnya ketika user mulai drag lagi. Hormati reduced-motion dengan langsung snap ke target.

**Baseline preview (simulasi berbasis frame):**

```js
// frame-based illustration; untuk production pilih integrator berbasis delta-time.
let velocity = releaseVelocity;
function frame() {
  velocity += (targetX - currentX) * 0.065; // spring pull
  velocity *= 0.78;                         // damping
  currentX += velocity;
  element.style.transform = `translate3d(${currentX}px,0,0)`;
  if (Math.abs(targetX - currentX) > 0.4 || Math.abs(velocity) > 0.12) {
    requestAnimationFrame(frame);
  } else {
    element.style.transform = `translate3d(${targetX}px,0,0)`;
  }
}
```

**Storyboard:** slow release → settle lembut; fast flick → mempertahankan momentum awal, lalu spring-damped ke anchor.

**Acceptance check:** Flick lambat vs cepat memperlihatkan respons awal berbeda dan sama-sama berhenti stabil.

## RULE-010 — Rubber-band resistance at carousel boundaries

**Keputusan:** Overscroll di awal/akhir carousel menampilkan **resistansi nonlinier** yang melambat ketika ditarik semakin jauh; setelah dilepas, **spring kembali ke batas yang valid**.

- Saat drag di dalam range valid, carousel mengikuti gerakan pointer secara langsung.
- Saat drag melampaui ujung, jarak visual harus menjadi jauh lebih kecil daripada jarak pointer, dengan kurva yang terasa seperti karet.
- Ketika pointer dilepas, spring ke batas terdekat; saat di tengah range, snap ke item terdekat dengan mempertimbangkan velocity flick.
- Indeks item harus tetap dalam range `[0, lastIndex]`; jangan membiarkan item aktif menjadi negatif atau melebihi jumlah item.
- Gunakan `pointer capture`, `touch-action: pan-y`, dan kontrol Next/Previous atau keyboard agar tidak eksklusif untuk gesture.

**Baseline preview (resistance function):**

```js
function rubber(distance) {
  return Math.sign(distance) * 90 * (1 - Math.exp(-Math.abs(distance) / 260));
}

// minX = offset paling kiri yang valid (negatif), maxX = 0
const renderedX = dragX > 0
  ? rubber(dragX)
  : dragX < minX
    ? minX - rubber(minX - dragX)
    : dragX;
// On release: spring back within [minX, 0] or snap to a valid item.
```

**Storyboard:** drag item normal → mencapai ujung → tarik lebih jauh (gerak makin tertahan) → lepas (spring-back).

**Acceptance check:** Kedua tepi memiliki resistansi, tidak bisa melewati indeks valid, dan tidak berhenti menggantung di luar carousel.

## Shared implementation constraints

### Accessibility

- `prefers-reduced-motion: reduce`: hapus/persingkat animasi dekoratif; pastikan state dan konten tetap berubah.
- Fokus keyboard, `:focus-visible`, click/touch target, serta label/screen reader tetap berfungsi selama animasi.
- Pesan error (`RULE-003`) tidak boleh hanya mengandalkan warna/getaran: sertakan teks dan `aria-invalid`/pengumuman error.
- Konten accordion tertutup harus tidak dapat difokuskan; stepper mengumumkan step aktif; tooltip tetap bisa diakses oleh keyboard.

### Performance

- Hindari layout thrashing/perhitungan layout yang terus-menerus selama gerak. Gunakan `requestAnimationFrame`/solusi spring yang dibatasi, transform, dan cancel animasi saat unmount.
- Perhitungkan mobile, viewport resize, pointer cancel, serta state ketika pengguna berinteraksi berulang kali dengan cepat.
- Uji di perangkat low-end; jangan menjadikan `will-change` aturan universal.

### Approval notes / agent contract

1. **RULE-001–003:** berasal dari arahan pengguna sebelumnya.
2. **RULE-004–010:** perilaku demo interaktif telah dinilai **"Good Good"** oleh pengguna; gunakan feel dan interaksi playground sebagai acuan.
3. Angka durasi, easing, stiffness, damping, delay, dan konstanta rubber band adalah **baseline referensi**, bukan constraint permanen kecuali pengguna menguncinya di kemudian hari.
4. Jika implementasi berbeda dari preview, **samakan dahulu behavior**, kemudian tuning timing. Jangan mengganti directional slide menjadi fade, jangan menghapus shake/error indicator, dan jangan mengganti spring dengan linear/fixed-duration slide.
5. Referensi implementasi: `frontend-motion-playground/src/main.jsx` dan `frontend-motion-playground/src/styles.css`. Jalankan menggunakan instruksi `README.md` di paket React.

### Final QA checklist

- [ ] Popup entrance `scale(0.97) → scale(1)` (bukan `scale(0)`).
- [ ] Tekan tombol action → scale ke `0.97`, lepas → balik `1`.
- [ ] Validasi gagal → red border + readable message + shake horizontal yang dapat dipicu ulang.
- [ ] Stepper Next slide kiri; Back slide kanan.
- [ ] Accordion interpolate ke tinggi natural, tanpa snap.
- [ ] Motion mengutamakan transform, bukan animasi top/left per frame.
- [ ] Ganti tema tidak memicu cascade transisi warna yang glitchy.
- [ ] Tooltip pertama delayed; tooltip berikutnya instant selama grace period.
- [ ] Flick slow/fast menghasilkan respons spring berbeda berdasarkan velocity.
- [ ] Carousel resist pada dua tepi dan spring-back saat dilepas.
- [ ] Reduced-motion, keyboard, touch/pointer, dan repeat interactions tetap berfungsi.
