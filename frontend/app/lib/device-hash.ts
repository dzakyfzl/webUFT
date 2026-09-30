/**
 * Generates a SHA-256 device fingerprint from stable browser signals.
 *
 * Signals used:
 *   - userAgent          (browser & OS identity)
 *   - screen size        (screen.width × screen.height)
 *   - color depth        (screen.colorDepth)
 *   - timezone           (Intl API)
 *   - platform           (navigator.platform)
 *   - language           (navigator.language)
 *   - hardwareConcurrency (CPU core count)
 *   - deviceMemory       (RAM estimate, Chrome only)
 *   - maxTouchPoints     (touch/pointer capability)
 *
 * Returns a 64-char hex string (SHA-256).
 *
 * NOTE: This is NOT cryptographic-grade fingerprinting.
 * It is sufficient to prevent casual duplicate voting at
 * a physical event (e.g., UFT photo competitions).
 *
 * Requires the Web Crypto API — available in all modern browsers
 * on HTTPS (and on HTTP localhost for development).
 */
export async function generateDeviceHash(): Promise<string> {
  // Guard: jika crypto.subtle tidak tersedia (HTTP non-localhost env lama), return empty
  if (
    typeof window === "undefined" ||
    !window.crypto ||
    !window.crypto.subtle
  ) {
    return "";
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
  };

  const signals = [
    nav.userAgent,
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    nav.platform,
    nav.language,
    `${nav.hardwareConcurrency ?? 0}`,
    `${nav.deviceMemory ?? 0}`,
    `${nav.maxTouchPoints ?? 0}`,
  ].join("|");

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(signals);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Graceful fallback — jangan blokir submission hanya karena hash gagal
    return "";
  }
}
