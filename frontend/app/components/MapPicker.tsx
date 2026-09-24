"use client";

import { useEffect, useRef, useState } from "react";

interface MapPickerProps {
  lat: string;
  lon: string;
  onPick: (lat: string, lon: string) => void;
}

/**
 * Komponen MapPicker — klik pada peta untuk memilih titik pusat geofence.
 * Menggunakan Leaflet via dynamic script injection, SSR-safe.
 */
export default function MapPicker({ lat, lon, onPick }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Default center: Telkom University Bandung
  const DEFAULT_LAT = -6.9736;
  const DEFAULT_LON = 107.6304;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mapRef.current) return; // sudah terinisialisasi

    let cancelled = false;

    const getLeaflet = (): Promise<any> =>
      new Promise((resolve, reject) => {
        const win = window as any;

        // Sudah tersedia
        if (win.L && win.L.map) { resolve(win.L); return; }

        // Inject CSS
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        // Inject JS
        if (document.getElementById("leaflet-js")) {
          // Script tag ada tapi L belum ready — tunggu
          const wait = () => {
            if (win.L && win.L.map) { resolve(win.L); return; }
            setTimeout(wait, 50);
          };
          wait();
          return;
        }

        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => {
          if (win.L && win.L.map) resolve(win.L);
          else reject(new Error("Leaflet loaded but L.map not found"));
        };
        script.onerror = () => reject(new Error("Gagal memuat Leaflet"));
        document.head.appendChild(script);
      });

    const init = async () => {
      try {
        const L = await getLeaflet();
        if (cancelled || !containerRef.current || mapRef.current) return;

        const initLat = lat ? parseFloat(lat) : DEFAULT_LAT;
        const initLon = lon ? parseFloat(lon) : DEFAULT_LON;
        const zoom = lat && lon ? 17 : 14;

        // Fix default icon URL
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(containerRef.current, { zoomControl: true });
        map.setView([initLat, initLon], zoom);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        // Marker awal jika koordinat sudah ada
        if (lat && lon) {
          markerRef.current = L.marker([initLat, initLon]).addTo(map);
        }

        // Klik → pindahkan marker + update koordinat
        map.on("click", (e: any) => {
          const { lat: clat, lng: clon } = e.latlng;
          const latStr = clat.toFixed(7);
          const lonStr = clon.toFixed(7);
          if (markerRef.current) {
            markerRef.current.setLatLng([clat, clon]);
          } else {
            markerRef.current = L.marker([clat, clon]).addTo(map);
          }
          onPick(latStr, lonStr);
        });

        mapRef.current = map;
        setStatus("ready");

        // ResizeObserver agar peta tidak blank
        const ro = new ResizeObserver(() => map.invalidateSize());
        ro.observe(containerRef.current!);
        return () => ro.disconnect();
      } catch (err) {
        console.error("MapPicker init error:", err);
        if (!cancelled) setStatus("error");
      }
    };

    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync marker ketika lat/lon berubah dari luar (mis. tombol GPS)
  useEffect(() => {
    if (!mapRef.current || !lat || !lon) return;
    const L = (window as any).L;
    if (!L) return;

    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([parsedLat, parsedLon]);
    } else {
      markerRef.current = L.marker([parsedLat, parsedLon]).addTo(mapRef.current);
    }
    mapRef.current.setView([parsedLat, parsedLon], 17, { animate: true });
  }, [lat, lon]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        {lat && lon
          ? `📍 Titik dipilih: [${parseFloat(lat).toFixed(5)}, ${parseFloat(lon).toFixed(5)}]`
          : "Klik pada peta untuk menentukan titik pusat geofence"}
        {lat && lon && (
          <button
            type="button"
            onClick={() => {
              if (markerRef.current && mapRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
              }
              onPick("", "");
            }}
            className="ml-3 text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            ✕ Hapus titik
          </button>
        )}
      </p>
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-white/10"
        style={{ height: "280px", background: "#0f0f11" }}
      >
        {status === "loading" && (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm animate-pulse">
            Memuat peta...
          </div>
        )}
        {status === "error" && (
          <div className="w-full h-full flex items-center justify-center text-red-400 text-sm">
            Gagal memuat peta. Periksa koneksi internet.
          </div>
        )}
      </div>
    </div>
  );
}
