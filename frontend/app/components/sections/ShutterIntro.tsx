"use client";

import { Camera, CircleDot, Focus, Gauge, Hand, Nfc, Palette, ScanEye, ScanFace, Timer, Video } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { ApertureLogo } from "./ApertureLogo";
import styles from "./shutter-intro.module.css";

const duration = 3600;

// Run from the homepage HTML so the intro and its deadline also work before hydration.
const introScript = `(() => {
  const root = document.documentElement;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  try {
    if (media.matches || !CSS.supports('clip-path', 'polygon(evenodd, 0 0, 100% 0, 50% 100%)')) return;
    if (!CSS.supports('backdrop-filter', 'blur(1px)') && !CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) return;
    if (location.hash && performance.getEntriesByType('navigation')[0]?.type !== 'reload') return;

    const controller = new AbortController();
    const options = { signal: controller.signal, passive: true };
    function finish() {
      delete root.dataset.uftIntro;
      clearTimeout(timer);
      controller.abort();
    }
    const timer = setTimeout(finish, ${duration + 100});
    for (const event of ['keydown', 'pointerdown', 'touchstart', 'wheel', 'pagehide', 'uft:intro-end']) {
      window.addEventListener(event, finish, options);
    }
    media.addEventListener('change', finish, options);
    root.dataset.uftIntro = 'playing';
  } catch { delete root.dataset.uftIntro; }
})()`;

function CameraReadouts() {
  return (
    <div className={styles.readouts}>
      <div className={styles.readoutHeader}>
        <span className={styles.readoutGroup}>
          <strong className={styles.captureMode}>P</strong>
          <span className={styles.cardStatus}>NO CARD</span>
        </span>
        <span className={`${styles.readoutGroup} ${styles.formatReadouts}`}>
          <span className={styles.invertedReadout}>3:2</span>
          <span>24M</span>
          <span>RAW</span>
          <span>X.FINE</span>
          <Nfc />
        </span>
        <span className={`${styles.readoutGroup} ${styles.batteryReadout}`}>
          <span className={styles.battery} />34%
        </span>
      </div>

      <div className={styles.readoutStatus}>
        <span className={styles.readoutGroup}><Timer />3</span>
        <span className={styles.readoutGroup}>
          <Hand />
          <span className={`${styles.readoutStack} ${styles.readoutDetail}`}><Camera /><Video /></span>
        </span>
        <ScanEye className={styles.meteringReadout} />
      </div>

      <div className={`${styles.sideReadouts} ${styles.leftReadouts}`}>
        <span className={styles.invertedReadout}>MF</span>
        <span className={styles.readoutGroup}><Focus />M</span>
        <span className={styles.readoutGroup}>
          <ScanFace />
          <span className={styles.readoutStack}><span>AF</span><span className={styles.readoutDetail}>ON</span></span>
        </span>
        <span className={styles.readoutStack}>
          <span className={styles.outlinedReadout}>PP</span><span className={styles.readoutDetail}>OFF</span>
        </span>
      </div>

      <div className={`${styles.sideReadouts} ${styles.rightReadouts}`}>
        <span>AWB</span>
        <span className={styles.readoutStack}>
          <span className={styles.invertedReadout}>D-R</span><span className={styles.readoutDetail}>OFF</span>
        </span>
        <span className={styles.readoutStack}>
          <span className={styles.outlinedReadout}>Std.</span><span className={styles.readoutDetail}>±0 ±0 ±0</span>
        </span>
        <span className={styles.readoutGroup}><Palette /><span className={styles.readoutDetail}>OFF</span></span>
      </div>

      <div className={styles.exposureReadouts}>
        <span>1/2000</span>
        <span>F8.0</span>
        <span className={styles.readoutStack}>
          <span className={styles.dialReadout}><Gauge />P</span>
          <span className={styles.exposureValue}>
            <span className={`${styles.outlinedReadout} ${styles.readoutDetail}`}>±</span>±0.0
          </span>
        </span>
        <span className={styles.readoutStack}>
          <span className={styles.dialReadout}><CircleDot />P</span>
          <span className={styles.exposureValue}><span className={styles.readoutDetail}>ISO</span> 102400</span>
        </span>
      </div>
    </div>
  );
}

export function ShutterIntro() {
  const overlay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = overlay.current;
    return () => {
      if (!element?.isConnected) window.dispatchEvent(new Event("uft:intro-end"));
    };
  }, []);

  return <>
    <script dangerouslySetInnerHTML={{ __html: introScript }} />
    <div ref={overlay} className={styles.optics} aria-hidden="true" style={{ "--intro": `${duration}ms` } as CSSProperties}>
      <CameraReadouts />
      <div className={styles.finder}><i/><i/><i/><i/><span/></div>
      <ApertureLogo className={styles.aperture} />
    </div>
  </>;
}
